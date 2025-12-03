import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Webinars() {
  return (
    <div className="flex flex-col min-h-full bg-background">
      <AppHeader title="Webinars" />
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Live Webinars</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Coming soon - live trading webinars</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
