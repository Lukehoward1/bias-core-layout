import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Link2, ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useSubscription } from "@/hooks/use-subscription";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubscriptionPlan } from "@/types/subscription";

export default function Settings() {
  const { plan, setPlan } = useSubscription();

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
