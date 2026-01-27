import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link2, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function Settings() {
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
