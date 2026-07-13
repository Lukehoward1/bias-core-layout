import { useEffect, useMemo, useState, useCallback } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Link2, ArrowRight, Sparkles, ShieldOff, RefreshCw, Lock, KeyRound, SlidersHorizontal, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/use-subscription";
import { useSubscription as useStripeSubscription } from "@/contexts/SubscriptionContext";
import { createPortalSession } from "@/lib/stripe";
import { CreditCard } from "lucide-react";
import { useSessionLock } from "@/hooks/use-session-lock";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { SubscriptionPlan } from "@/types/subscription";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLinkedAccounts } from "@/hooks/use-linked-accounts";
import { useActiveTradingAccount, ACTIVE_ACCOUNT_ALL } from "@/hooks/use-active-trading-account";
import { ConnectedAccountsList } from "@/components/account/ConnectedAccountsList";
import { ConnectAccountModal } from "@/components/account/ConnectAccountModal";
import { useTraderBiasMode, getBiasTimeframesForStyle, type BiasTimeframe } from "@/hooks/use-trader-style";

type TraderStyle = "scalper" | "intraday" | "swing";

const ALL_TIMEFRAMES: { value: BiasTimeframe; label: string }[] = [
  { value: "1m", label: "1m" },
  { value: "5m", label: "5m" },
  { value: "15m", label: "15m" },
  { value: "30m", label: "30m" },
  { value: "1h", label: "1H" },
  { value: "4h", label: "4H" },
  { value: "1d", label: "D" },
  { value: "1w", label: "W" },
];

export default function Settings() {
  const navigate = useNavigate();
  const { plan, setPlan } = useSubscription();
  const {
    subscriptionStatus,
    subscriptionTier,
    isFoundingMember,
    isTrial,
    trialEndsAt,
    currentPeriodEnd,
    stripeCustomerId,
  } = useStripeSubscription();
  const [portalLoading, setPortalLoading] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const { pinEnabled, setPinEnabled, pinSet, setPin, clearPin } = useSessionLock();

  const { accounts, primaryAccount } = useLinkedAccounts();
  const { activeAccountId, setActiveAccountId } = useActiveTradingAccount();

  const {
    traderStyle,
    setTraderStyle,
    traderStyleLabel,
    biasTimeframes,
    customTimeframes,
    setCustomTimeframes,
    clearCustomTimeframes,
  } = useTraderBiasMode();

  const [pendingTimeframes, setPendingTimeframes] = useState<BiasTimeframe[]>(
    () => customTimeframes ?? getBiasTimeframesForStyle(traderStyle),
  );

  // Keep pending in sync with style defaults when no custom override is active
  useEffect(() => {
    if (!customTimeframes) {
      setPendingTimeframes(getBiasTimeframesForStyle(traderStyle));
    }
  }, [traderStyle, customTimeframes]);

  const toggleTimeframe = (tf: BiasTimeframe) => {
    setPendingTimeframes((prev) => (prev.includes(tf) ? prev.filter((t) => t !== tf) : [...prev, tf]));
  };

  const handleResetToDefaults = () => {
    clearCustomTimeframes();
    setPendingTimeframes(getBiasTimeframesForStyle(traderStyle));
  };

  const handleSave = () => {
    if (pendingTimeframes.length === 0) {
      clearCustomTimeframes();
    } else {
      setCustomTimeframes(pendingTimeframes);
    }
    navigate("/dashboard");
  };

  const [lockOverlayDisabled, setLockOverlayDisabled] = useState(() => {
    return localStorage.getItem("dev-disable-lock-overlay") === "true";
  });

  // PIN management state
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinSetupError, setPinSetupError] = useState("");

  const handleToggleLockOverlay = (disabled: boolean) => {
    setLockOverlayDisabled(disabled);
    if (disabled) localStorage.setItem("dev-disable-lock-overlay", "true");
    else localStorage.removeItem("dev-disable-lock-overlay");
  };

  const handleForceReload = () => window.location.reload();

  const handleTogglePinEnabled = (enabled: boolean) => {
    setPinEnabled(enabled);
    if (enabled && !pinSet) setShowPinSetup(true);
  };

  const handleSetPin = () => {
    if (newPin.length !== 4) return setPinSetupError("PIN must be 4 digits");
    if (!/^\d{4}$/.test(newPin)) return setPinSetupError("PIN must contain only numbers");
    if (newPin !== confirmPin) return setPinSetupError("PINs do not match");

    setPin(newPin);
    setShowPinSetup(false);
    setNewPin("");
    setConfirmPin("");
    setPinSetupError("");
  };

  const handleRemovePin = () => {
    clearPin();
    setPinEnabled(false);
  };

  const handleCancelPinSetup = () => {
    setShowPinSetup(false);
    setNewPin("");
    setConfirmPin("");
    setPinSetupError("");
    if (!pinSet) setPinEnabled(false);
  };

  const handleManageBilling = useCallback(async () => {
    if (!stripeCustomerId) { navigate("/pricing"); return; }
    setPortalLoading(true);
    try { await createPortalSession(stripeCustomerId); }
    finally { setPortalLoading(false); }
  }, [stripeCustomerId, navigate]);

  const planOptions: { value: SubscriptionPlan; label: string; color: string }[] = [
    { value: "free", label: "Free", color: "bg-muted text-muted-foreground" },
    { value: "standard", label: "Standard", color: "bg-primary/20 text-primary" },
    { value: "premium", label: "Premium", color: "bg-accent text-accent-foreground" },
  ];

  // ── Account Settings state ───────────────────────────────────────────────────
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [nameLoading, setNameLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Load full_name from profiles on mount
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.full_name) setFullName(data.full_name);
      });
  }, [user]);

  const handleSaveName = async () => {
    if (!user) return;
    setNameLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim() || null })
      .eq("id", user.id);
    setNameLoading(false);
    if (error) toast.error("Failed to save name");
    else toast.success("Profile updated");
  };

  const handleChangePassword = async () => {
    setPasswordError(null);
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    setPasswordLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user?.email ?? "",
      password: currentPassword,
    });
    if (signInError) {
      setPasswordLoading(false);
      setPasswordError("Current password is incorrect");
      return;
    }
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordLoading(false);
    if (updateError) {
      setPasswordError(updateError.message);
    } else {
      toast.success("Password updated");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const activeAccountLabel = useMemo(() => {
    if (activeAccountId === ACTIVE_ACCOUNT_ALL) return "All Accounts";
    const found = accounts.find((a) => a.id === activeAccountId);
    return found?.name ?? "Selected Account";
  }, [activeAccountId, accounts]);

  const primaryLabel = useMemo(() => primaryAccount?.name ?? "None", [primaryAccount]);

  const formatTier = (tier: string) => {
    if (tier === "founding_member") return "Founding Member";
    return tier.charAt(0).toUpperCase() + tier.slice(1);
  };
  const formatStatus = (status: string) =>
    status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <div className="flex flex-col min-h-full bg-background">
      <AppHeader title="Settings" />

      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* ✅ Trading Preferences */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Trading Preferences</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Set global defaults for how StreamBias displays performance and calculates bias across the platform.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Data Scope */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Data Scope (default viewing account)</Label>
                  <Badge variant="outline" className="text-xs">
                    Primary: {primaryLabel}
                  </Badge>
                </div>

                <Select value={activeAccountId} onValueChange={(v) => setActiveAccountId(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select viewing scope" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value={ACTIVE_ACCOUNT_ALL}>All Accounts</SelectItem>

                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id} disabled={!a.isConnected}>
                        {a.name}
                        {primaryAccount?.id === a.id ? " (Primary)" : ""}
                        {!a.isConnected ? " (Disconnected)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <p className="text-xs text-muted-foreground">
                  Current viewing scope: <span className="font-medium text-foreground">{activeAccountLabel}</span>
                </p>
              </div>

              {/* Trader Style / Bias Mode */}
              <div className="space-y-2">
                <Label className="text-sm">Trader Style (bias mode)</Label>

                <Select value={traderStyle} onValueChange={(v) => setTraderStyle(v as TraderStyle)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select trader style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scalper">Scalper</SelectItem>
                    <SelectItem value="intraday">Intraday</SelectItem>
                    <SelectItem value="swing">Swing</SelectItem>
                  </SelectContent>
                </Select>

                <p className="text-xs text-muted-foreground">
                  Current mode: <span className="font-medium text-foreground">{traderStyleLabel}</span> • Timeframes:{" "}
                  <span className="font-medium text-foreground">{biasTimeframes.join(" / ")}</span>
                </p>
              </div>

              {/* Bias Timeframe Override */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Bias Timeframe Override</Label>
                  {customTimeframes && customTimeframes.length > 0 && (
                    <>
                      <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                        Custom
                      </Badge>
                      <button
                        type="button"
                        onClick={handleResetToDefaults}
                        className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                      >
                        Reset to defaults
                      </button>
                    </>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {ALL_TIMEFRAMES.map(({ value, label }) => {
                    const active = pendingTimeframes.includes(value);
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => toggleTimeframe(value)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                          active
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-transparent text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                <p className="text-xs text-muted-foreground">
                  Default timeframes for your trader style are used when no override is set.
                </p>
              </div>

              <Button className="w-full" onClick={handleSave}>
                Save Preferences
              </Button>
            </CardContent>
          </Card>

          {/* Session Privacy */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Session Privacy</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Protect your dashboard with a 4-digit PIN. When enabled, you'll need to enter your PIN to unlock after
                inactivity.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Switch id="pin-enabled" checked={pinEnabled} onCheckedChange={handleTogglePinEnabled} />
                  <Label htmlFor="pin-enabled" className="text-sm">
                    Enable PIN lock
                  </Label>
                </div>

                {pinSet && (
                  <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">
                    PIN Set
                  </Badge>
                )}
              </div>

              {pinEnabled && pinSet && !showPinSetup && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowPinSetup(true)} className="gap-1">
                    <KeyRound className="h-3.5 w-3.5" />
                    Change PIN
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemovePin}
                    className="text-destructive hover:text-destructive"
                  >
                    Remove PIN
                  </Button>
                </div>
              )}

              {showPinSetup && (
                <div className="space-y-3 p-4 bg-muted/50 rounded-lg border border-border">
                  <div className="space-y-2">
                    <Label htmlFor="new-pin" className="text-xs text-muted-foreground">
                      {pinSet ? "New PIN" : "Enter PIN"}
                    </Label>
                    <Input
                      id="new-pin"
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      value={newPin}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                        setNewPin(val);
                        setPinSetupError("");
                      }}
                      className="max-w-32 text-center tracking-[0.3em]"
                      placeholder="••••"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-pin" className="text-xs text-muted-foreground">
                      Confirm PIN
                    </Label>
                    <Input
                      id="confirm-pin"
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      value={confirmPin}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                        setConfirmPin(val);
                        setPinSetupError("");
                      }}
                      className="max-w-32 text-center tracking-[0.3em]"
                      placeholder="••••"
                    />
                  </div>

                  {pinSetupError && <p className="text-xs text-destructive">{pinSetupError}</p>}

                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={handleSetPin}>
                      {pinSet ? "Update PIN" : "Set PIN"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCancelPinSetup}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dev Safety */}
          <Card className="border-dashed border-warning/30">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <ShieldOff className="h-5 w-5 text-warning" />
                <CardTitle className="text-base">Session Lock Override</CardTitle>
                <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/30">
                  Dev Safety
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Disable the session privacy overlay if it's blocking app interaction. Requires page reload.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Switch id="disable-lock" checked={lockOverlayDisabled} onCheckedChange={handleToggleLockOverlay} />
                  <Label htmlFor="disable-lock" className="text-sm">
                    Disable lock overlay
                  </Label>
                </div>
                <Button variant="outline" size="sm" onClick={handleForceReload} className="gap-1">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Reload to apply
                </Button>
              </div>

              {lockOverlayDisabled && (
                <p className="text-xs text-warning">
                  Lock overlay is disabled. The app will not show the lock screen on inactivity or first load.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Billing */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Billing</CardTitle>
              </div>
              <CardDescription className="text-xs">Manage your subscription and billing details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {subscriptionTier ? formatTier(subscriptionTier) : "No active plan"}
                    {isFoundingMember && (
                      <Badge className="ml-2 text-[10px] bg-primary/20 text-primary border-primary/30" variant="outline">
                        Founding Member
                      </Badge>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Status: {formatStatus(subscriptionStatus ?? "inactive")}
                  </p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  {isTrial && trialEndsAt && (
                    <p>Trial ends {new Date(trialEndsAt).toLocaleDateString()}</p>
                  )}
                  {!isTrial && currentPeriodEnd && (
                    <p>Renews {new Date(currentPeriodEnd).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={portalLoading}
                  onClick={handleManageBilling}
                >
                  {portalLoading ? "Loading…" : "Manage Subscription"}
                </Button>
                {subscriptionTier === "standard" && (
                  <Button size="sm" onClick={() => navigate("/pricing")}>
                    Upgrade to Pro
                  </Button>
                )}
                {!subscriptionStatus || subscriptionStatus === "inactive" || subscriptionStatus === "cancelled" ? (
                  <Button size="sm" onClick={() => navigate("/pricing")}>
                    Choose a Plan
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {import.meta.env.DEV && (
          <Card className="border-dashed border-primary/30">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Plan Switcher</CardTitle>
                <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                  Dev Mode
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Test tier gating by switching plans. This will be replaced with real billing integration.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground mr-2">Current plan:</span>
                <div className="flex gap-2">
                  {planOptions.map((option) => (
                    <Button
                      key={option.value}
                      variant={plan === option.value ? "default" : "outline"}
                      size="sm"
                      className={plan === option.value ? option.color : ""}
                      onClick={() => setPlan(option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
          )}

          {/* Connected Accounts */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-primary" />
                <CardTitle>Connected Accounts</CardTitle>
              </div>
            </CardHeader>

            <CardContent>
              <ConnectedAccountsList onConnectClick={() => setShowConnectModal(true)} />
            </CardContent>
          </Card>

          <ConnectAccountModal open={showConnectModal} onOpenChange={setShowConnectModal} />

          {/* Account Settings */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Account Settings</CardTitle>
              </div>
              <CardDescription className="text-xs">Manage your profile and account security.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* Profile subsection */}
              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground">Profile</p>
                <div className="space-y-2">
                  <Label htmlFor="account-email">Email</Label>
                  <Input
                    id="account-email"
                    type="email"
                    value={user?.email ?? ""}
                    disabled
                    className="bg-muted/40 text-muted-foreground"
                  />
                  <p className="text-xs text-muted-foreground">Contact support to change your email.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account-name">Display Name</Label>
                  <Input
                    id="account-name"
                    type="text"
                    placeholder="Your name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Shown in the "Welcome, …" greeting on your Dashboard.</p>
                </div>
                <Button size="sm" onClick={handleSaveName} disabled={nameLoading}>
                  {nameLoading ? "Saving…" : "Save Changes"}
                </Button>
              </div>

              <div className="border-t border-border" />

              {/* Change Password subsection */}
              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground">Change Password</p>
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
                {passwordError && (
                  <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{passwordError}</p>
                )}
                <Button size="sm" onClick={handleChangePassword} disabled={passwordLoading}>
                  {passwordLoading ? "Updating…" : "Update Password"}
                </Button>
              </div>

            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
