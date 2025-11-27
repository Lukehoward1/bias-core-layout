import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Articles() {
  return (
    <div className="flex flex-col h-full">
      <AppHeader title="Articles & Guides" />
      <div className="flex-1 overflow-y-auto bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Articles & Guides</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Coming soon - trading articles and guides</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
