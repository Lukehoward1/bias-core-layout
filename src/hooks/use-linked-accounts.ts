import { useState, useEffect, useCallback } from 'react';
import { useSubscription } from './use-subscription';
import { canLinkMoreAccounts, getRemainingAccountSlots } from '@/types/subscription';

export interface LinkedAccount {
  id: string;
  name: string;
  broker: string;
  balance: number;
  currency: string;
  isConnected: boolean;
  lastUpdated: Date;
}

export interface LinkAccountResult {
  success: boolean;
  message: string;
  account?: LinkedAccount;
}

interface UseLinkedAccountsReturn {
  accounts: LinkedAccount[];
  primaryAccount: LinkedAccount | null;
  isLoading: boolean;
  accountCount: number;
  maxAccounts: number;
  remainingSlots: number;
  canLinkMore: boolean;
  canLinkAccounts: boolean;
  // Actions
  linkAccount: (accountData: Omit<LinkedAccount, 'id' | 'lastUpdated'>) => LinkAccountResult;
  unlinkAccount: (accountId: string) => void;
  refreshAccount: (accountId: string) => void;
  refreshAllAccounts: () => void;
  setPrimaryAccount: (accountId: string) => void;
}

const STORAGE_KEY = 'linkedTradingAccounts';
const PRIMARY_ACCOUNT_KEY = 'primaryTradingAccountId';

// Generate unique ID for new accounts
function generateAccountId(): string {
  return `account-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function useLinkedAccounts(): UseLinkedAccountsReturn {
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [primaryAccountId, setPrimaryAccountId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { plan, limits } = useSubscription();

  // Load accounts from localStorage on mount
  useEffect(() => {
    const loadAccounts = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          const loadedAccounts = parsed.map((acc: any) => ({
            ...acc,
            lastUpdated: new Date(acc.lastUpdated),
          }));
          setAccounts(loadedAccounts);
        }

        const savedPrimary = localStorage.getItem(PRIMARY_ACCOUNT_KEY);
        if (savedPrimary) {
          setPrimaryAccountId(savedPrimary);
        }
      } catch (error) {
        console.error('Failed to load linked accounts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAccounts();

    // Listen for storage changes from other tabs/components
    const handleStorageChange = () => loadAccounts();
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('linkedAccountsUpdated', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('linkedAccountsUpdated', handleStorageChange);
    };
  }, []);

  // Persist accounts to localStorage whenever they change
  const persistAccounts = useCallback((newAccounts: LinkedAccount[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newAccounts));
    window.dispatchEvent(new Event('linkedAccountsUpdated'));
  }, []);

  // Calculate derived values
  const accountCount = accounts.length;
  const maxAccounts = limits.maxLinkedAccounts;
  const remainingSlots = getRemainingAccountSlots(plan, accountCount);
  const canLinkMore = canLinkMoreAccounts(plan, accountCount);
  const canLinkAccounts = limits.canLinkAccounts;

  // Get primary account (first connected account if no primary set)
  const primaryAccount = accounts.find(a => a.id === primaryAccountId && a.isConnected) 
    ?? accounts.find(a => a.isConnected) 
    ?? null;

  // Link a new account with plan-based enforcement
  const linkAccount = useCallback((accountData: Omit<LinkedAccount, 'id' | 'lastUpdated'>): LinkAccountResult => {
    // Check if plan allows account linking
    if (!limits.canLinkAccounts) {
      return {
        success: false,
        message: 'Account linking is not available on your current plan.',
      };
    }

    // Check if user is at the limit
    if (!canLinkMoreAccounts(plan, accounts.length)) {
      return {
        success: false,
        message: "You've reached the account limit for your plan.",
      };
    }

    // Create the new account
    const newAccount: LinkedAccount = {
      ...accountData,
      id: generateAccountId(),
      lastUpdated: new Date(),
    };

    const newAccounts = [...accounts, newAccount];
    setAccounts(newAccounts);
    persistAccounts(newAccounts);

    // Set as primary if it's the first account
    if (newAccounts.length === 1) {
      setPrimaryAccountId(newAccount.id);
      localStorage.setItem(PRIMARY_ACCOUNT_KEY, newAccount.id);
    }

    return {
      success: true,
      message: 'Account linked successfully.',
      account: newAccount,
    };
  }, [accounts, plan, limits.canLinkAccounts, persistAccounts]);

  // Unlink an account (preserves other accounts)
  const unlinkAccount = useCallback((accountId: string) => {
    const newAccounts = accounts.filter(a => a.id !== accountId);
    setAccounts(newAccounts);
    persistAccounts(newAccounts);

    // Update primary if we removed the primary account
    if (primaryAccountId === accountId) {
      const newPrimary = newAccounts.find(a => a.isConnected)?.id ?? null;
      setPrimaryAccountId(newPrimary);
      if (newPrimary) {
        localStorage.setItem(PRIMARY_ACCOUNT_KEY, newPrimary);
      } else {
        localStorage.removeItem(PRIMARY_ACCOUNT_KEY);
      }
    }
  }, [accounts, primaryAccountId, persistAccounts]);

  // Refresh a specific account's data
  const refreshAccount = useCallback((accountId: string) => {
    setIsLoading(true);
    // Simulate API call delay
    setTimeout(() => {
      setAccounts(prev => prev.map(acc => 
        acc.id === accountId 
          ? { ...acc, lastUpdated: new Date() }
          : acc
      ));
      setIsLoading(false);
    }, 500);
  }, []);

  // Refresh all accounts
  const refreshAllAccounts = useCallback(() => {
    setIsLoading(true);
    setTimeout(() => {
      setAccounts(prev => prev.map(acc => ({
        ...acc,
        lastUpdated: new Date(),
      })));
      setIsLoading(false);
    }, 500);
  }, []);

  // Set a specific account as primary
  const setPrimaryAccount = useCallback((accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    if (account) {
      setPrimaryAccountId(accountId);
      localStorage.setItem(PRIMARY_ACCOUNT_KEY, accountId);
    }
  }, [accounts]);

  return {
    accounts,
    primaryAccount,
    isLoading,
    accountCount,
    maxAccounts,
    remainingSlots,
    canLinkMore,
    canLinkAccounts,
    linkAccount,
    unlinkAccount,
    refreshAccount,
    refreshAllAccounts,
    setPrimaryAccount,
  };
}

// ============================================
// Legacy compatibility - maintain old API
// ============================================

const LEGACY_STORAGE_KEY = 'linkedTradingAccount';

// For backward compatibility with existing components
export function useLinkedAccount() {
  const { 
    primaryAccount, 
    isLoading, 
    refreshAccount,
    canLinkAccounts,
  } = useLinkedAccounts();

  return {
    account: primaryAccount,
    isLoading,
    isConnected: primaryAccount?.isConnected ?? false,
    balance: primaryAccount?.isConnected ? primaryAccount.balance : null,
    currency: primaryAccount?.currency ?? 'GBP',
    refreshBalance: () => primaryAccount && refreshAccount(primaryAccount.id),
    canLinkAccounts,
  };
}

// Legacy utility - save mock account for testing
export function saveMockLinkedAccount(balance: number, isConnected: boolean = true): void {
  const MOCK_ACCOUNT = {
    id: 'demo-account-1',
    name: 'Demo Trading Account',
    broker: 'Demo Broker',
    balance,
    currency: 'GBP',
    isConnected,
    lastUpdated: new Date(),
  };
  
  // Save to new multi-account system
  const accounts = [MOCK_ACCOUNT];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  localStorage.setItem(PRIMARY_ACCOUNT_KEY, MOCK_ACCOUNT.id);
  
  // Also save to legacy key for compatibility
  localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(MOCK_ACCOUNT));
  
  window.dispatchEvent(new Event('storage'));
  window.dispatchEvent(new Event('linkedAccountsUpdated'));
}

// Clear all linked accounts
export function clearLinkedAccounts(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(PRIMARY_ACCOUNT_KEY);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
  window.dispatchEvent(new Event('storage'));
  window.dispatchEvent(new Event('linkedAccountsUpdated'));
}

// Legacy alias
export const clearLinkedAccount = clearLinkedAccounts;
