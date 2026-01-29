import { useState, useEffect } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Link2, ArrowRight, Sparkles, ShieldOff, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { useSubscription } from "@/hooks/use-subscription";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SubscriptionPlan } from "@/types/subscription";

export default function Settings() {
  const { plan, setPlan } = useSubscription();
  const [lockOverlayDisabled, setLockOverlayDisabled] = useState(() => {
    return localStorage.getItem('dev-disable-lock-overlay') === 'true';
  });

  const handleToggleLockOverlay = (disabled: boolean) => {
    setLockOverlayDisabled(disabled);
    if (disabled) {
      localStorage.setItem('dev-disable-lock-overlay', 'true');
    } else {
      localStorage.removeItem('dev-disable-lock-overlay');
    }
  };

  const handleForceReload = () => {
    window.location.reload();
  };

  const planOptions: { value: SubscriptionPlan; label: string; color: string }[] = [
    { value: 'free', label: 'Free', color: 'bg-muted text-muted-foreground' },
    { value: 'standard', label: 'Standard', color: 'bg-primary/20 text-primary' },
    { value: 'premium', label: 'Premium', color: 'bg-accent text-accent-foreground' },
  ];

  return (
    <div className="flex flex-col min-h-full bg-background">
      <AppHeader title="Settings" />
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Dev Safety: Disable Lock Overlay */}
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
                  <Switch
                    id="disable-lock"
                    checked={lockOverlayDisabled}
                    onCheckedChange={handleToggleLockOverlay}
                  />
                  <Label htmlFor="disable-lock" className="text-sm">
                    Disable lock overlay
                  </Label>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleForceReload}
                  className="gap-1"
                >
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

          {/* Plan Switcher (Development/Testing) */}
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

          {/* Connected Accounts Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-primary" />
                <CardTitle>Connected Accounts</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                To link a broker account, go to{" "}
                <Link 
                  to="/brokerage" 
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  Brokerage → Connections
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </p>
            </CardContent>
          </Card>

          {/* Account Settings Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Coming soon - account preferences and settings</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
