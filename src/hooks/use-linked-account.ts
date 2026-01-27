import { useState, useEffect, useCallback } from 'react';

export interface LinkedAccount {
  id: string;
  name: string;
  broker: string;
  balance: number;
  currency: string;
  isConnected: boolean;
  lastUpdated: Date;
}

interface UseLinkedAccountReturn {
  account: LinkedAccount | null;
  isLoading: boolean;
  isConnected: boolean;
  balance: number | null;
  currency: string;
  refreshBalance: () => void;
}

// Mock account data for development - will be replaced with real broker API
const MOCK_ACCOUNT: LinkedAccount = {
  id: 'demo-account-1',
  name: 'Demo Trading Account',
  broker: 'Demo Broker',
  balance: 10000,
  currency: 'GBP',
  isConnected: false, // Set to false to show empty state by default
  lastUpdated: new Date(),
};

const STORAGE_KEY = 'linkedTradingAccount';

export function useLinkedAccount(): UseLinkedAccountReturn {
  const [account, setAccount] = useState<LinkedAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load account from localStorage on mount
  useEffect(() => {
    const loadAccount = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setAccount({
            ...parsed,
            lastUpdated: new Date(parsed.lastUpdated),
          });
        }
      } catch (error) {
        console.error('Failed to load linked account:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAccount();
  }, []);

  // Simulate refreshing balance from broker API
  const refreshBalance = useCallback(() => {
    if (!account?.isConnected) return;
    
    setIsLoading(true);
    // Simulate API call delay
    setTimeout(() => {
      setAccount(prev => prev ? {
        ...prev,
        lastUpdated: new Date(),
      } : null);
      setIsLoading(false);
    }, 500);
  }, [account?.isConnected]);

  return {
    account,
    isLoading,
    isConnected: account?.isConnected ?? false,
    balance: account?.isConnected ? account.balance : null,
    currency: account?.currency ?? 'GBP',
    refreshBalance,
  };
}

// Utility to save mock account for testing
export function saveMockLinkedAccount(balance: number, isConnected: boolean = true): void {
  const account: LinkedAccount = {
    ...MOCK_ACCOUNT,
    balance,
    isConnected,
    lastUpdated: new Date(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
  window.dispatchEvent(new Event('storage'));
}

// Clear linked account
export function clearLinkedAccount(): void {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event('storage'));
}
