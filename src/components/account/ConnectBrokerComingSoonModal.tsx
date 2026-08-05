import { useState, useEffect } from "react";
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
import { AlertCircle, Plug } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useLinkedAccounts } from "@/hooks/use-linked-accounts";

interface ConnectBrokerComingSoonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DRAFT_KEY = "connectBrokerFormDraft";

function readDraft() {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveDraft(fields: { platform: string; login: string; server: string }) {
  try {
    const existing = readDraft() ?? {};
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...existing, ...fields }));
  } catch {}
}

function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {}
}

export function ConnectBrokerComingSoonModal({
  open,
  onOpenChange,
}: ConnectBrokerComingSoonModalProps) {
  const { session } = useAuth();
  const { canLinkMore, accountCount, maxAccounts, reloadAccounts } = useLinkedAccounts();

  const [platform, setPlatform] = useState<"mt4" | "mt5">("mt4");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [server, setServer] = useState("");
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Restore draft and mark modal as open so a page reload auto-reopens it
  useEffect(() => {
    if (!open) return;
    const draft = readDraft() ?? {};
    if (draft.platform) setPlatform(draft.platform as "mt4" | "mt5");
    if (draft.login)    setLogin(draft.login);
    if (draft.server)   setServer(draft.server);
    // wasOpen flag: picked up by ConnectedAccountsList on next load
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, wasOpen: true })); } catch {}
  }, [open]);

  const clearApiError = () => setApiError(null);

  const resetForm = () => {
    setPlatform("mt4");
    setLogin("");
    setPassword("");
    setServer("");
    setApiError(null);
    clearDraft();
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetForm();
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    if (!login.trim())  { setApiError("MT login is required.");      return; }
    if (!password)      { setApiError("Investor password is required."); return; }
    if (!server.trim()) { setApiError("Server name is required.");    return; }
    if (!session?.access_token) { setApiError("Session expired. Please sign in again."); return; }

    setApiError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/broker-connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          login: login.trim(),
          password,
          server: server.trim(),
          platform,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setApiError(data.error ?? "Connection failed. Please try again.");
        return;
      }

      await reloadAccounts();
      toast.success("Broker account connected successfully!");
      handleOpenChange(false);
    } catch {
      setApiError("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Plug className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-lg">Connect Broker Account</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            Connect your MT4 or MT5 account to sync trades automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="platform">Platform</Label>
            <Select
              value={platform}
              onValueChange={(v) => {
                setPlatform(v as "mt4" | "mt5");
                saveDraft({ platform: v, login, server });
                clearApiError();
              }}
            >
              <SelectTrigger id="platform">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mt4">MetaTrader 4 (MT4)</SelectItem>
                <SelectItem value="mt5">MetaTrader 5 (MT5)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mt-login">MT Login</Label>
            <Input
              id="mt-login"
              value={login}
              onChange={(e) => { setLogin(e.target.value); saveDraft({ platform, login: e.target.value, server }); clearApiError(); }}
              placeholder="e.g. 207605"
              autoComplete="username"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mt-password">Investor Password</Label>
            <Input
              id="mt-password"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); clearApiError(); }}
              placeholder="Your MT4/MT5 investor password"
              autoComplete="current-password"
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              This is the read-only password, not your main trading password. In MT4/MT5: Tools → Options → Server → Change Investor Password.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mt-server">Server</Label>
            <Input
              id="mt-server"
              value={server}
              onChange={(e) => { setServer(e.target.value); saveDraft({ platform, login, server: e.target.value }); clearApiError(); }}
              placeholder="e.g. PepperstoneUK-Demo03"
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Find this in your MT4/MT5 terminal under File → Open an Account.
            </p>
          </div>

          {!canLinkMore && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-destructive">
                You've reached the account limit for your plan ({accountCount}/{maxAccounts}).
              </p>
            </div>
          )}

          {apiError && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
              {apiError}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !canLinkMore}>
            {isSubmitting ? "Connecting..." : "Connect Account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
