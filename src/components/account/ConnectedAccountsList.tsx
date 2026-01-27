import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Link2, 
  Trash2, 
  RefreshCw, 
  Star,
  AlertCircle,
  ArrowRight 
} from "lucide-react";
import { useLinkedAccounts, type LinkedAccount } from "@/hooks/use-linked-accounts";
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
  } = useLinkedAccounts();

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
        <Button onClick={onConnectClick} className="gap-2">
          <Link2 className="h-4 w-4" />
          Connect Account
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Account slots info */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {accountCount} of {maxAccounts} account slots used
        </p>
        <Button 
          onClick={onConnectClick} 
          disabled={!canLinkMore || !canLinkAccounts}
          size="sm"
          className="gap-2"
        >
          <Link2 className="h-4 w-4" />
          Connect Account
        </Button>
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
          />
        ))}
      </div>
    </div>
  );
}

interface AccountCardProps {
  account: LinkedAccount;
  isPrimary: boolean;
  onSetPrimary: () => void;
  onRefresh: () => void;
  onUnlink: () => void;
}

function AccountCard({ account, isPrimary, onSetPrimary, onRefresh, onUnlink }: AccountCardProps) {
  return (
    <Card className={cn(
      "bg-card border-border",
      isPrimary && "ring-1 ring-primary/50"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className={cn(
              "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
              account.isConnected ? "bg-primary/10" : "bg-muted"
            )}>
              <Link2 className={cn(
                "h-5 w-5",
                account.isConnected ? "text-primary" : "text-muted-foreground"
              )} />
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
              <div className="flex items-center gap-3 mt-1">
                <span className="text-lg font-semibold text-foreground">
                  £{account.balance.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground">
                  Updated {format(account.lastUpdated, "HH:mm")}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!isPrimary && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onSetPrimary}
                className="text-xs"
              >
                Set Primary
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onRefresh}
              className="h-8 w-8"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onUnlink}
              className="h-8 w-8 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
