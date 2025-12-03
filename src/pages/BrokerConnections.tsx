import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function BrokerConnections() {
  return (
    <div className="flex flex-col min-h-full bg-background">
      <AppHeader title="Broker Connections" />
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Connect Your Broker</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Coming soon - broker API integrations</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
