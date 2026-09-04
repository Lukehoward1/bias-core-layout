import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link2, Plug, Trash2, RefreshCw, Star, AlertCircle, Pencil, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useLinkedAccounts, type LinkedAccount } from "@/hooks/use-linked-accounts";
import { ConnectBrokerModal } from "@/components/account/ConnectBrokerModal";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface ConnectedAccountsListProps {
  onConnectClick: () => void;
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
    updateAccountBalance,
  } = useLinkedAccounts();

  const [showBrokerModal, setShowBrokerModal] = useState(() => {
    try {
      const raw = sessionStorage.getItem("connectBrokerFormDraft");
      return raw ? JSON.parse(raw)?.wasOpen === true : false;
    } catch {
      return false;
    }
  });

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
      <>
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

        <ConnectBrokerModal open={showBrokerModal} onOpenChange={setShowBrokerModal} />
      </>
    );
  }

  return (
    <div className="space-y-4">
      {/* Account slots info */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {accountCount} of {maxAccounts} account slots used
        </p>

        <div className="flex items-center gap-2 flex-wrap">
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

      {/* Connected accounts list */}
      <div className="space-y-3">
        {accounts.map((account) => (
          <AccountCard
            key={account.id}
            account={account}
            isPrimary={primaryAccount?.id === account.id}
            onSetPrimary={() => setPrimaryAccount(account.id)}
            onRefresh={() => refreshAccount(account.id)}
            onUnlink={() => unlinkAccount(account.id)}
            onEditBalance={(newBalance) => updateAccountBalance(account.id, newBalance)}
          />
        ))}
      </div>

      <ConnectBrokerModal open={showBrokerModal} onOpenChange={setShowBrokerModal} />
    </div>
  );
}

interface AccountCardProps {
  account: LinkedAccount;
  isPrimary: boolean;
  onSetPrimary: () => void;
  onRefresh: () => void;
  onUnlink: () => Promise<void>;
  onEditBalance: (newBalance: number) => Promise<{ success: boolean; message?: string }>;
}

function AccountCard({
  account,
  isPrimary,
  onSetPrimary,
  onRefresh,
  onUnlink,
  onEditBalance,
}: AccountCardProps) {
  const [confirming, setConfirming] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [editingBalance, setEditingBalance] = useState(false);
  const [balanceDraft, setBalanceDraft] = useState(() => String(account.balance));
  const [savingBalance, setSavingBalance] = useState(false);

  function startEditingBalance() {
    setBalanceDraft(String(account.balance));
    setEditingBalance(true);
  }

  async function handleSaveBalance() {
    const parsed = parseFloat(balanceDraft);
    if (!Number.isFinite(parsed) || parsed < 0) {
      toast.error("Please enter a valid balance.");
      return;
    }
    setSavingBalance(true);
    const result = await onEditBalance(parsed);
    setSavingBalance(false);
    if (result.success) {
      toast.success("Balance updated.");
      setEditingBalance(false);
    } else {
      toast.error(result.message ?? "Failed to update balance. Please try again.");
    }
  }

  async function handleConfirmUnlink() {
    setDisconnecting(true);
    try {
      await onUnlink();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to disconnect account. Please try again.";
      toast.error(msg);
      setDisconnecting(false);
      setConfirming(false);
    }
  }

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
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

                {isPrimary && (
                  <Badge variant="secondary" className="text-xs shrink-0">
                    <Star className="h-3 w-3 mr-1" />
                    Primary
                  </Badge>
                )}
              </div>

              <p className="text-sm text-muted-foreground">{account.broker}</p>

              {editingBalance ? (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-muted-foreground">£</span>
                  <Input
                    type="number"
                    min={0}
                    value={balanceDraft}
                    onChange={(e) => setBalanceDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveBalance();
                      if (e.key === "Escape") setEditingBalance(false);
                    }}
                    autoFocus
                    disabled={savingBalance}
                    className="h-7 w-32 text-sm"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-success hover:text-success"
                    onClick={handleSaveBalance}
                    disabled={savingBalance}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setEditingBalance(false)}
                    disabled={savingBalance}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-lg font-semibold text-foreground">£{account.balance.toLocaleString()}</span>
                  {!account.hasBrokerConnection && (
                    <button
                      type="button"
                      onClick={startEditingBalance}
                      className="text-muted-foreground hover:text-foreground"
                      title="Edit balance"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <span className="text-xs text-muted-foreground">Updated {format(account.lastUpdated, "HH:mm")}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 self-end sm:self-start sm:shrink-0">
            {disconnecting ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Disconnecting...</span>
              </div>
            ) : confirming ? (
              <>
                <span className="text-sm text-destructive shrink-0">
                  Delete &ldquo;{account.name}&rdquo;?
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-destructive hover:text-destructive shrink-0"
                  onClick={handleConfirmUnlink}
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
