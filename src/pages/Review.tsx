import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Journal from "./Journal";
import { DailyRiskLimitTracker } from "@/components/risk/DailyRiskLimitTracker";
import { MaxDrawdownGuard } from "@/components/risk/MaxDrawdownGuard";
import { DynamicRiskAdvisor } from "@/components/risk/DynamicRiskAdvisor";
import { AppHeader } from "@/components/AppHeader";

export default function Review() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "risk" ? "risk" : "journal";

  const setTab = (t: string) =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p);
        n.set("tab", t);
        return n;
      },
      { replace: true },
    );

  return (
    <div className="p-3 sm:p-6 space-y-4">
      <AppHeader title="Review" />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="journal">Journal</TabsTrigger>
          <TabsTrigger value="risk">Risk</TabsTrigger>
        </TabsList>
        <TabsContent value="journal">
          <Journal />
        </TabsContent>
        <TabsContent value="risk" className="space-y-6 mt-4">
          <DailyRiskLimitTracker />
          <MaxDrawdownGuard />
          <DynamicRiskAdvisor />
        </TabsContent>
      </Tabs>
    </div>
  );
}
