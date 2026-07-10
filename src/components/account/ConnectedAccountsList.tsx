import { useEffect, useMemo, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link2, Plug, Trash2, RefreshCw, Star, AlertCircle } from "lucide-react";
import { useLinkedAccounts, type LinkedAccount } from "@/hooks/use-linked-accounts";
import { ConnectBrokerComingSoonModal } from "@/components/account/ConnectBrokerComingSoonModal";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface ConnectedAccountsListProps {
  onConnectClick: () => void;
}

/**
 * Active account selection:
 * - "__all__" means "All Accounts"
 * - otherwise it's a LinkedAccount.id
 */
const ACTIVE_ACCOUNT_KEY = "activeTradingAccountId";
const ACTIVE_ACCOUNT_EVENT = "activeTradingAccountChanged";
const ALL_ACCOUNTS_VALUE = "__all__";

function readActiveAccountId(): string {
  const raw = localStorage.getItem(ACTIVE_ACCOUNT_KEY);
  return raw && raw.trim().length > 0 ? raw : ALL_ACCOUNTS_VALUE;
}

function writeActiveAccountId(value: string) {
  localStorage.setItem(ACTIVE_ACCOUNT_KEY, value);
  window.dispatchEvent(new Event(ACTIVE_ACCOUNT_EVENT));
}

export function ConnectedAccountsList({ onConnectClick }: ConnectedAccountsListProps) {
  const {
    accounts,
    primaryAccount,
    isLoading,
    accountCount,
    maxAccounts,
    canLinkMore,
    canLinkAccounts,
    unlinkAccount,
    refreshAccount,
    setPrimaryAccount,
  } = useLinkedAccounts();

  const [activeAccountId, setActiveAccountId] = useState<string>(ALL_ACCOUNTS_VALUE);
  const [showBrokerModal, setShowBrokerModal] = useState(false);

  // Load active selection on mount + listen for changes (other tabs/components)
  useEffect(() => {
    const syncFromStorage = () => setActiveAccountId(readActiveAccountId());

    syncFromStorage();

    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === ACTIVE_ACCOUNT_KEY) syncFromStorage();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(ACTIVE_ACCOUNT_EVENT, syncFromStorage);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(ACTIVE_ACCOUNT_EVENT, syncFromStorage);
    };
  }, []);

  // If active account was deleted/disconnected, fall back safely
  useEffect(() => {
    if (activeAccountId === ALL_ACCOUNTS_VALUE) return;
    const exists = accounts.some((a) => a.id === activeAccountId);
    if (!exists) {
      setActiveAccountId(ALL_ACCOUNTS_VALUE);
      writeActiveAccountId(ALL_ACCOUNTS_VALUE);
    }
  }, [accounts, activeAccountId]);

  const setActive = useCallback((id: string) => {
    setActiveAccountId(id);
    writeActiveAccountId(id);
  }, []);

  const activeLabel = useMemo(() => {
    if (activeAccountId === ALL_ACCOUNTS_VALUE) return "All Accounts";
    const match = accounts.find((a) => a.id === activeAccountId);
    return match?.name ?? "Selected Account";
  }, [activeAccountId, accounts]);

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground mt-2">Loading accounts...</p>
      </div>
    );
  }

  // Empty state
  if (accounts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <Link2 className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">No accounts connected</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
          Connect a trading account to automatically sync your balance for risk calculations.
        </p>
        <div className="flex items-center gap-2 justify-center">
          <Button onClick={onConnectClick} className="gap-2">
            <Link2 className="h-4 w-4" />
            Add Manual Account
          </Button>
          <Button variant="outline" onClick={() => setShowBrokerModal(true)} className="gap-2">
            <Plug className="h-4 w-4" />
            Connect Broker
          </Button>
        </div>
      </div>

      <ConnectBrokerComingSoonModal open={showBrokerModal} onOpenChange={setShowBrokerModal} />
    );
  }

  return (
    <div className="space-y-4">
      {/* Account slots info */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <p className="text-sm text-muted-foreground">
            {accountCount} of {maxAccounts} account slots used
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Viewing:</span>
            <Badge variant="outline" className="text-[10px]">
              {activeLabel}
            </Badge>
            {activeAccountId !== ALL_ACCOUNTS_VALUE && primaryAccount?.id === activeAccountId && (
              <Badge variant="secondary" className="text-[10px]">
                <Star className="h-3 w-3 mr-1" />
                Primary
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={onConnectClick} disabled={!canLinkMore || !canLinkAccounts} size="sm" className="gap-2">
            <Link2 className="h-4 w-4" />
            Add Manual Account
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowBrokerModal(true)} className="gap-2">
            <Plug className="h-4 w-4" />
            Connect Broker
          </Button>
        </div>
      </div>

      {/* Limit warning */}
      {!canLinkMore && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-muted/50 border border-border">
          <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
          <p className="text-sm text-muted-foreground">
            You've reached the account limit for your plan. Upgrade to connect more accounts.
          </p>
        </div>
      )}

      {/* "All Accounts" selector row */}
      <Card className={cn("bg-card border-border", activeAccountId === ALL_ACCOUNTS_VALUE && "ring-1 ring-primary/50")}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", "bg-muted")}>
                <Link2 className={cn("h-5 w-5", "text-muted-foreground")} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-foreground truncate">All Accounts</h4>
                  {activeAccountId === ALL_ACCOUNTS_VALUE && (
                    <Badge variant="secondary" className="text-xs shrink-0">
                      Viewing
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">Show combined performance across all accounts</p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {activeAccountId !== ALL_ACCOUNTS_VALUE && (
                <Button variant="ghost" size="sm" onClick={() => setActive(ALL_ACCOUNTS_VALUE)} className="text-xs">
                  Set Active
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connected accounts list */}
      <div className="space-y-3">
        {accounts.map((account) => (
          <AccountCard
            key={account.id}
            account={account}
            isPrimary={primaryAccount?.id === account.id}
            isActive={activeAccountId === account.id}
            onSetPrimary={() => setPrimaryAccount(account.id)}
            onSetActive={() => setActive(account.id)}
            onRefresh={() => refreshAccount(account.id)}
            onUnlink={() => unlinkAccount(account.id)}
          />
        ))}
      </div>

      <ConnectBrokerComingSoonModal open={showBrokerModal} onOpenChange={setShowBrokerModal} />
    </div>
  );
}

interface AccountCardProps {
  account: LinkedAccount;
  isPrimary: boolean;
  isActive: boolean;
  onSetPrimary: () => void;
  onSetActive: () => void;
  onRefresh: () => void;
  onUnlink: () => void;
}

function AccountCard({
  account,
  isPrimary,
  isActive,
  onSetPrimary,
  onSetActive,
  onRefresh,
  onUnlink,
}: AccountCardProps) {
  const [confirming, setConfirming] = useState(false);

  return (
    <Card className={cn("bg-card border-border", isActive && "ring-1 ring-primary/50")}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div
              className={cn(
                "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                account.isConnected ? "bg-primary/10" : "bg-muted",
              )}
            >
              <Link2 className={cn("h-5 w-5", account.isConnected ? "text-primary" : "text-muted-foreground")} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-foreground truncate">{account.name}</h4>

                {isActive && (
                  <Badge variant="secondary" className="text-xs shrink-0">
                    Viewing
                  </Badge>
                )}

                {isPrimary && (
                  <Badge variant="secondary" className="text-xs shrink-0">
                    <Star className="h-3 w-3 mr-1" />
                    Primary
                  </Badge>
                )}
              </div>

              <p className="text-sm text-muted-foreground">{account.broker}</p>

              <div className="flex items-center gap-3 mt-1">
                <span className="text-lg font-semibold text-foreground">£{account.balance.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">Updated {format(account.lastUpdated, "HH:mm")}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {confirming ? (
              <>
                <span className="text-sm text-destructive shrink-0">
                  Delete &ldquo;{account.name}&rdquo;?
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-destructive hover:text-destructive shrink-0"
                  onClick={() => { onUnlink(); setConfirming(false); }}
                >
                  Yes, delete
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs shrink-0"
                  onClick={() => setConfirming(false)}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                {!isActive && (
                  <Button variant="ghost" size="sm" onClick={onSetActive} className="text-xs">
                    Set Active
                  </Button>
                )}

                {!isPrimary && (
                  <Button variant="ghost" size="sm" onClick={onSetPrimary} className="text-xs">
                    Set Primary
                  </Button>
                )}

                <Button variant="ghost" size="icon" onClick={onRefresh} className="h-8 w-8">
                  <RefreshCw className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setConfirming(true)}
                  className="h-8 w-8 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
