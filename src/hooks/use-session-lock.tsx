import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { resetInteractionState } from '@/lib/resetInteractionState';

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const SESSION_KEY = 'streambias-session-active';

interface SessionLockContextValue {
  isLocked: boolean;
  unlock: () => void;
  lock: () => void;
  lastActivityTime: number;
}

const SessionLockContext = createContext<SessionLockContextValue | null>(null);

export function SessionLockProvider({ children }: { children: ReactNode }) {
  // Check if this is a fresh session (no sessionStorage marker)
  const [isLocked, setIsLocked] = useState(() => {
    if (typeof window === 'undefined') return true;
    return sessionStorage.getItem(SESSION_KEY) !== 'true';
  });
  
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());

  // Track user activity
  const updateActivity = useCallback(() => {
    setLastActivityTime(Date.now());
  }, []);

  // Unlock the session
  const unlock = useCallback(() => {
    setIsLocked(false);
    sessionStorage.setItem(SESSION_KEY, 'true');
    setLastActivityTime(Date.now());
    
    // Synchronously reset interaction state
    resetInteractionState();
    
    // Schedule a second pass on next frame to catch any delayed DOM updates
    requestAnimationFrame(() => {
      resetInteractionState();
    });
  }, []);

  // Lock the session (manual lock)
  const lock = useCallback(() => {
    setIsLocked(true);
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
    <SessionLockContext.Provider value={{ isLocked, unlock, lock, lastActivityTime }}>
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
