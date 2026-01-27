import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link2, AlertCircle } from "lucide-react";
import { AccountLinkingModal } from "@/components/account/AccountLinkingModal";

export default function Settings() {
  const [showLinkingModal, setShowLinkingModal] = useState(false);

  return (
    <div className="flex flex-col min-h-full bg-background">
      <AppHeader title="Settings" />
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Connected Accounts Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-primary" />
                <CardTitle>Connected Accounts</CardTitle>
              </div>
              <CardDescription>
                Connect an account to auto-sync balance and streamline risk sizing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Empty State */}
              <div className="p-4 rounded-lg border border-dashed border-border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">No accounts connected</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Link a trading account to enable automatic balance sync.
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Coming soon
                  </Badge>
                </div>
              </div>

              {/* Connect Button */}
              <Button 
                variant="outline" 
                onClick={() => setShowLinkingModal(true)}
                className="gap-2"
              >
                <Link2 className="h-4 w-4" />
                Connect account (Coming soon)
              </Button>
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

      {/* Account Linking Modal */}
      <AccountLinkingModal 
        open={showLinkingModal} 
        onOpenChange={setShowLinkingModal} 
      />
    </div>
  );
}
