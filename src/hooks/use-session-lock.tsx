import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const SESSION_KEY = 'streambias-session-active';
const PIN_ENABLED_KEY = 'streambias_pin_enabled';
const PIN_VALUE_KEY = 'streambias_pin_value';

interface SessionLockContextValue {
  isLocked: boolean;
  unlock: (pin?: string) => boolean;
  lock: () => void;
  lastActivityTime: number;
  pinEnabled: boolean;
  setPinEnabled: (enabled: boolean) => void;
  pinSet: boolean;
  setPin: (pin: string) => void;
  clearPin: () => void;
}

const SessionLockContext = createContext<SessionLockContextValue | null>(null);

export function SessionLockProvider({ children }: { children: ReactNode }) {
  // Initialize: locked only if sessionStorage key is absent (first load of session)
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return sessionStorage.getItem(SESSION_KEY) !== 'true';
  });
  
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  
  // PIN state from localStorage
  const [pinEnabled, setPinEnabledState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(PIN_ENABLED_KEY) === 'true';
  });
  
  const [pinValue, setPinValue] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(PIN_VALUE_KEY);
  });

  const pinSet = pinValue !== null && pinValue.length === 4;

  // Track user activity
  const updateActivity = useCallback(() => {
    setLastActivityTime(Date.now());
  }, []);

  // Enable/disable PIN
  const setPinEnabled = useCallback((enabled: boolean) => {
    setPinEnabledState(enabled);
    if (enabled) {
      localStorage.setItem(PIN_ENABLED_KEY, 'true');
    } else {
      localStorage.removeItem(PIN_ENABLED_KEY);
    }
  }, []);

  // Set a new PIN
  const setPin = useCallback((pin: string) => {
    if (pin.length === 4 && /^\d{4}$/.test(pin)) {
      setPinValue(pin);
      localStorage.setItem(PIN_VALUE_KEY, pin);
    }
  }, []);

  // Clear PIN
  const clearPin = useCallback(() => {
    setPinValue(null);
    localStorage.removeItem(PIN_VALUE_KEY);
  }, []);

  // Unlock the session
  const unlock = useCallback((pin?: string): boolean => {
    // If PIN is enabled and set, validate it
    if (pinEnabled && pinSet) {
      if (pin !== pinValue) {
        return false; // Wrong PIN
      }
    }
    
    // Unlock successful
    sessionStorage.setItem(SESSION_KEY, 'true');
    setIsLocked(false);
    setLastActivityTime(Date.now());
    return true;
  }, [pinEnabled, pinSet, pinValue]);

  // Lock the session (manual lock)
  const lock = useCallback(() => {
    setIsLocked(true);
    // Do NOT clear SESSION_KEY - only set isLocked state
  }, []);

  // Listen for user activity to reset inactivity timer
  useEffect(() => {
    if (isLocked) return; // Don't track when already locked

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      updateActivity();
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [isLocked, updateActivity]);

  // Check for inactivity timeout
  useEffect(() => {
    if (isLocked) return;

    const checkInactivity = () => {
      const now = Date.now();
      const timeSinceActivity = now - lastActivityTime;
      
      if (timeSinceActivity >= INACTIVITY_TIMEOUT_MS) {
        setIsLocked(true);
      }
    };

    // Check every minute
    const interval = setInterval(checkInactivity, 60 * 1000);
    
    return () => clearInterval(interval);
  }, [isLocked, lastActivityTime]);

  return (
    <SessionLockContext.Provider value={{ 
      isLocked, 
      unlock, 
      lock, 
      lastActivityTime,
      pinEnabled,
      setPinEnabled,
      pinSet,
      setPin,
      clearPin
    }}>
      {children}
    </SessionLockContext.Provider>
  );
}

export function useSessionLock() {
  const context = useContext(SessionLockContext);
  if (!context) {
    throw new Error('useSessionLock must be used within a SessionLockProvider');
  }
  return context;
}
