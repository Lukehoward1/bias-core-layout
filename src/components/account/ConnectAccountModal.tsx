import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link2, AlertCircle } from "lucide-react";
import { useLinkedAccounts } from "@/hooks/use-linked-accounts";
import { toast } from "sonner";

interface ConnectAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MOCK_PROVIDERS = [
  { id: "demo", name: "Demo Broker", available: true },
  { id: "topstep", name: "Topstep (Coming Soon)", available: false },
  { id: "tradelocker", name: "TradeLocker (Coming Soon)", available: false },
];

export function ConnectAccountModal({ open, onOpenChange }: ConnectAccountModalProps) {
  const { linkAccount, accountCount, maxAccounts, canLinkMore } = useLinkedAccounts();
  const [provider, setProvider] = useState("demo");
  const [accountName, setAccountName] = useState("Demo Account 1");
  const [balance, setBalance] = useState<number>(10000);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = () => {
    if (!canLinkMore) {
      toast.error("You've reached the account limit for your plan.");
      return;
    }

    const selectedProvider = MOCK_PROVIDERS.find(p => p.id === provider);
    if (!selectedProvider?.available) {
      toast.error("This provider is not yet available.");
      return;
    }

    if (!accountName.trim()) {
      toast.error("Please enter an account name.");
      return;
    }

    if (balance <= 0) {
      toast.error("Please enter a valid balance.");
      return;
    }

    setIsSubmitting(true);

    // Simulate connection delay
    setTimeout(() => {
      const result = linkAccount({
        name: accountName.trim(),
        broker: selectedProvider.name,
        balance,
        currency: "GBP",
        isConnected: true,
      });

      setIsSubmitting(false);

      if (result.success) {
        toast.success("Account connected successfully!");
        onOpenChange(false);
        // Reset form
        setAccountName("Demo Account 1");
        setBalance(10000);
        setProvider("demo");
      } else {
        toast.error(result.message);
      }
    }, 500);
  };

  const selectedProviderData = MOCK_PROVIDERS.find(p => p.id === provider);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Link2 className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-lg">Connect Account</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            Link a trading account to auto-sync your balance for risk calculations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Provider Selection */}
          <div className="space-y-2">
            <Label htmlFor="provider">Provider</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger id="provider">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {MOCK_PROVIDERS.map((p) => (
                  <SelectItem 
                    key={p.id} 
                    value={p.id}
                    disabled={!p.available}
                  >
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Account Name */}
          <div className="space-y-2">
            <Label htmlFor="account-name">Account Name</Label>
            <Input
              id="account-name"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="e.g., Demo Account 1"
            />
          </div>

          {/* Currency (Fixed) */}
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Input
              id="currency"
              value="GBP (£)"
              disabled
              className="bg-muted"
            />
          </div>

          {/* Balance */}
          <div className="space-y-2">
            <Label htmlFor="balance">Balance (£)</Label>
            <Input
              id="balance"
              type="number"
              value={balance}
              onChange={(e) => setBalance(parseFloat(e.target.value) || 0)}
              placeholder="10000"
              min={0}
            />
          </div>

          {/* Account Limit Warning */}
          {!canLinkMore && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
              <p className="text-sm text-destructive">
                You've reached the account limit for your plan ({accountCount}/{maxAccounts}).
              </p>
            </div>
          )}

          {/* Slots remaining */}
          {canLinkMore && (
            <p className="text-xs text-muted-foreground">
              Account slots: {accountCount}/{maxAccounts} used
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !canLinkMore || !selectedProviderData?.available}
          >
            {isSubmitting ? "Connecting..." : "Connect Account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
