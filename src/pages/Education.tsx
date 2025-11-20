import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Education() {
  return (
    <div className="flex flex-col h-full">
      <AppHeader title="Education" />
      <div className="flex-1 overflow-y-auto bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Educational Resources</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Coming soon - trading courses and tutorials</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
