import { useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Trophy, Grid3X3, Sparkles, ChevronRight, ArrowRight, Link2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ConnectedAccountsList } from "@/components/account/ConnectedAccountsList";
import { ConnectAccountModal } from "@/components/account/ConnectAccountModal";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLinkedAccounts } from "@/hooks/use-linked-accounts";
import { useSelectedTradingAccount, SelectedTradingAccountId } from "@/hooks/use-selected-trading-account";

// Broker data
const brokers = [
  {
    name: "Pepperstone",
    logo: "🔵",
    minDeposit: "$200",
    spreadModel: "From 0.0 pips",
    commission: "Commission-based (Razor) or Spread-only (Standard)",
    instruments: "Forex, CFDs, Indices, Commodities, Crypto",
    execution: "ECN / NDD",
    regulation: "ASIC, FCA, CySEC, DFSA",
  },
  {
    name: "IC Markets",
    logo: "🟢",
    minDeposit: "$200",
    spreadModel: "From 0.0 pips",
    commission: "Commission-based (Raw Spread) or Spread-only (Standard)",
    instruments: "Forex, CFDs, Indices, Commodities, Bonds, Crypto",
    execution: "ECN / True ECN",
    regulation: "ASIC, CySEC, FSA",
  },
  {
    name: "FXPro",
    logo: "🟡",
    minDeposit: "$100",
    spreadModel: "From 0.6 pips",
    commission: "Spread-only or Commission-based accounts available",
    instruments: "Forex, CFDs, Indices, Metals, Energies, Crypto",
    execution: "NDD / STP",
    regulation: "FCA, CySEC, FSCA, SCB",
  },
];

// Prop firm data
const propFirms = [
  {
    name: "FTMO",
    logo: "🏆",
    profitTarget: "10% (Phase 1), 5% (Phase 2)",
    drawdown: "5% Daily / 10% Overall (Static)",
    evaluation: "Two-phase evaluation",
    instruments: "Forex, Indices, Commodities, Crypto, Stocks",
    typicalFee: "$155 - $1,080 (refundable)",
    payout: "Up to 90%",
  },
  {
    name: "Apex Trader Funding",
    logo: "📈",
    profitTarget: "$1,500 - $20,000 (varies by account)",
    drawdown: "Trailing Threshold Drawdown",
    evaluation: "Single-phase evaluation",
    instruments: "Futures (ES, NQ, CL, GC, etc.)",
    typicalFee: "$147 - $657",
    payout: "100% first $25K, then 90%",
  },
  {
    name: "Topstep",
    logo: "⬆️",
    profitTarget: "$2,000 - $6,000 (varies by account)",
    drawdown: "Trailing Max Drawdown",
    evaluation: "Trading Combine",
    instruments: "Futures (CME, CBOT, NYMEX, COMEX)",
    typicalFee: "$49 - $149/month",
    payout: "100% first $10K, then 90%",
  },
];

export default function Brokerage() {
  const [activeTab, setActiveTab] = useState("connections");
  const [smartMatchStep, setSmartMatchStep] = useState(0);
  const [smartMatchAnswers, setSmartMatchAnswers] = useState({
    assetType: "",
    pricingPreference: "",
    accountType: "",
    priority: "",
  });
  const [showConnectModal, setShowConnectModal] = useState(false);

  // ✅ Linked accounts list
  const { accounts, primaryAccount } = useLinkedAccounts();

  // ✅ Global selected account for the whole app
  const { selectedId, setSelectedId, selectedAccountId, resetToAll } = useSelectedTradingAccount();

  const selectedAccountLabel = useMemo(() => {
    if (selectedId === "all") return "All accounts";
    const found = accounts.find((a) => a.id === selectedAccountId);
    return found?.name ?? "Selected account";
  }, [selectedId, selectedAccountId, accounts]);

  const handleSmartMatchAnswer = (question: string, answer: string) => {
    setSmartMatchAnswers((prev) => ({ ...prev, [question]: answer }));
    if (smartMatchStep < 3) {
      setSmartMatchStep((prev) => prev + 1);
    }
  };

  const resetSmartMatch = () => {
    setSmartMatchStep(0);
    setSmartMatchAnswers({
      assetType: "",
      pricingPreference: "",
      accountType: "",
      priority: "",
    });
  };

  const getMatchingProviders = () => {
    const { assetType, accountType } = smartMatchAnswers;

    if (accountType === "funded") {
      return propFirms.filter((firm) => {
        if (assetType === "futures") return firm.name !== "FTMO";
        if (assetType === "forex") return firm.name === "FTMO";
        return true;
      });
    } else {
      return brokers;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="flex flex-col min-h-0">
        <AppHeader title="Brokerage Connections" />

        <div className="p-4 sm:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full max-w-2xl grid-cols-5 mb-6">
                <TabsTrigger value="connections" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                  <Link2 className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Connections</span>
                  <span className="sm:hidden">Conn</span>
                </TabsTrigger>
                <TabsTrigger value="brokers" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                  <Building2 className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Brokers</span>
                  <span className="sm:hidden">Brkr</span>
                </TabsTrigger>
                <TabsTrigger value="propfirms" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                  <Trophy className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Prop Firms</span>
                  <span className="sm:hidden">Prop</span>
                </TabsTrigger>
                <TabsTrigger value="compare" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                  <Grid3X3 className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Compare</span>
                  <span className="sm:hidden">Cmp</span>
                </TabsTrigger>
                <TabsTrigger value="smartmatch" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                  <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Match</span>
                  <span className="sm:hidden">Match</span>
                </TabsTrigger>
              </TabsList>

              {/* Connections Tab */}
              <TabsContent value="connections" className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">Connected Accounts</h2>
                  <p className="text-sm text-muted-foreground">
                    Connect an account to auto-sync balance and streamline risk sizing.
                  </p>
                </div>

                {/* ✅ NEW: Global account selector (data scope) */}
                <Card className="bg-card border-border">
                  <CardHeader className="pb-3">
                    <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
                      <div>
                        <CardTitle className="text-base">Data Scope</CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          Choose which account the app should display across Journal, Reports and Dashboard.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {primaryAccount ? (
                          <Badge variant="outline" className="text-[10px] sm:text-xs">
                            Primary: {primaryAccount.name}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] sm:text-xs">
                            No primary account
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="w-full sm:max-w-sm">
                        <Label className="text-xs text-muted-foreground">Viewing</Label>
                        <Select value={selectedId} onValueChange={(v) => setSelectedId(v as SelectedTradingAccountId)}>
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Select account scope" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All accounts</SelectItem>

                            {accounts.map((a) => (
                              <SelectItem key={a.id} value={`account:${a.id}`}>
                                {a.name}
                                {primaryAccount?.id === a.id ? " (Primary)" : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <p className="text-[11px] text-muted-foreground mt-2">
                          Current: <span className="text-foreground font-medium">{selectedAccountLabel}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 sm:ml-auto">
                        <Button variant="outline" size="sm" onClick={resetToAll} disabled={selectedId === "all"}>
                          View all
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardContent className="pt-6">
                    <ConnectedAccountsList onConnectClick={() => setShowConnectModal(true)} />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Brokers Tab */}
              <TabsContent value="brokers" className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">Retail Brokers</h2>
                  <p className="text-sm text-muted-foreground">
                    Factual comparison of popular brokers. No recommendations or rankings.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                  {brokers.map((broker) => (
                    <Card key={broker.name} className="bg-card border-border hover:border-primary/30 transition-colors">
                      <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-muted flex items-center justify-center text-xl sm:text-2xl">
                            {broker.logo}
                          </div>
                          <CardTitle className="text-base sm:text-lg">{broker.name}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <span className="text-xs sm:text-sm text-muted-foreground">Min. Deposit</span>
                            <span className="text-xs sm:text-sm font-medium text-foreground">{broker.minDeposit}</span>
                          </div>
                          <div className="flex justify-between items-start">
                            <span className="text-xs sm:text-sm text-muted-foreground">Spreads</span>
                            <span className="text-xs sm:text-sm font-medium text-foreground">{broker.spreadModel}</span>
                          </div>
                          <div>
                            <span className="text-xs sm:text-sm text-muted-foreground">Commission Model</span>
                            <p className="text-xs sm:text-sm text-foreground mt-1">{broker.commission}</p>
                          </div>
                          <div>
                            <span className="text-xs sm:text-sm text-muted-foreground">Instruments</span>
                            <p className="text-xs sm:text-sm text-foreground mt-1">{broker.instruments}</p>
                          </div>
                          <div className="flex justify-between items-start">
                            <span className="text-xs sm:text-sm text-muted-foreground">Execution</span>
                            <Badge variant="outline" className="text-[10px] sm:text-xs">
                              {broker.execution}
                            </Badge>
                          </div>
                          <div>
                            <span className="text-xs sm:text-sm text-muted-foreground">Regulation</span>
                            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{broker.regulation}</p>
                          </div>
                        </div>
                        <Button variant="outline" className="w-full mt-4 text-sm">
                          Learn More
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Prop Firms Tab */}
              <TabsContent value="propfirms" className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">Proprietary Trading Firms</h2>
                  <p className="text-sm text-muted-foreground">
                    Factual comparison of funded account providers. No recommendations or rankings.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                  {propFirms.map((firm) => (
                    <Card key={firm.name} className="bg-card border-border hover:border-primary/30 transition-colors">
                      <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-muted flex items-center justify-center text-xl sm:text-2xl">
                            {firm.logo}
                          </div>
                          <CardTitle className="text-base sm:text-lg">{firm.name}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-3">
                          <div>
                            <span className="text-xs sm:text-sm text-muted-foreground">Profit Target</span>
                            <p className="text-xs sm:text-sm font-medium text-foreground mt-1">{firm.profitTarget}</p>
                          </div>
                          <div>
                            <span className="text-xs sm:text-sm text-muted-foreground">Drawdown Model</span>
                            <p className="text-xs sm:text-sm font-medium text-foreground mt-1">{firm.drawdown}</p>
                          </div>
                          <div className="flex justify-between items-start">
                            <span className="text-xs sm:text-sm text-muted-foreground">Evaluation</span>
                            <Badge variant="outline" className="text-[10px] sm:text-xs">
                              {firm.evaluation}
                            </Badge>
                          </div>
                          <div>
                            <span className="text-xs sm:text-sm text-muted-foreground">Instruments</span>
                            <p className="text-xs sm:text-sm text-foreground mt-1">{firm.instruments}</p>
                          </div>
                          <div className="flex justify-between items-start">
                            <span className="text-xs sm:text-sm text-muted-foreground">Typical Fee</span>
                            <span className="text-xs sm:text-sm font-medium text-foreground">{firm.typicalFee}</span>
                          </div>
                          <div className="flex justify-between items-start">
                            <span className="text-xs sm:text-sm text-muted-foreground">Profit Split</span>
                            <span className="text-xs sm:text-sm font-medium text-success">{firm.payout}</span>
                          </div>
                        </div>
                        <Button variant="outline" className="w-full mt-4 text-sm">
                          Learn More
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Compare Tab */}
              <TabsContent value="compare" className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">Comparison Grid</h2>
                  <p className="text-sm text-muted-foreground">
                    Side-by-side factual comparison. No sorting or ranking applied.
                  </p>
                </div>

                {/* Brokers Comparison */}
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      Retail Brokers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto -mx-4 sm:mx-0">
                      <table className="w-full min-w-[600px]">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Provider</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">
                              Min Deposit
                            </th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Spreads</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">
                              Commission
                            </th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Execution</th>
                          </tr>
                        </thead>
                        <tbody>
                          {brokers.map((broker) => (
                            <tr key={broker.name} className="border-b border-border">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <span>{broker.logo}</span>
                                  <span className="font-medium text-foreground text-sm">{broker.name}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-xs sm:text-sm text-foreground">{broker.minDeposit}</td>
                              <td className="py-3 px-4 text-xs sm:text-sm text-foreground">{broker.spreadModel}</td>
                              <td className="py-3 px-4 text-xs text-muted-foreground">
                                {broker.commission.split(" or ")[0]}
                              </td>
                              <td className="py-3 px-4">
                                <Badge variant="outline" className="text-[10px]">
                                  {broker.execution}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Prop Firms Comparison */}
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      Prop Firms
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto -mx-4 sm:mx-0">
                      <table className="w-full min-w-[600px]">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Provider</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">
                              Profit Target
                            </th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Drawdown</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">
                              Evaluation
                            </th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">
                              Typical Fee
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {propFirms.map((firm) => (
                            <tr key={firm.name} className="border-b border-border">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <span>{firm.logo}</span>
                                  <span className="font-medium text-foreground text-sm">{firm.name}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-xs sm:text-sm text-foreground">
                                {firm.profitTarget.split(" (")[0]}
                              </td>
                              <td className="py-3 px-4 text-xs text-muted-foreground">
                                {firm.drawdown.split(" / ")[0]}
                              </td>
                              <td className="py-3 px-4">
                                <Badge variant="outline" className="text-[10px]">
                                  {firm.evaluation}
                                </Badge>
                              </td>
                              <td className="py-3 px-4 text-xs sm:text-sm text-foreground">
                                {firm.typicalFee.split(" (")[0]}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Smart Match Tab */}
              <TabsContent value="smartmatch" className="space-y-6">
                <div className="text-center mb-8 pt-4 sm:pt-8">
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">Smart Match</h2>
                  <p className="text-sm text-muted-foreground">
                    Answer a few questions to find providers that fit your preferences.
                  </p>
                </div>

                <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
                  {smartMatchStep < 4 && (
                    <Card className="bg-card border-border">
                      <CardContent className="pt-6 pb-6">
                        {smartMatchStep === 0 && (
                          <div className="space-y-5">
                            <h3 className="text-base sm:text-lg font-semibold text-foreground">
                              What assets do you primarily trade?
                            </h3>
                            <RadioGroup
                              value={smartMatchAnswers.assetType}
                              onValueChange={(value) => handleSmartMatchAnswer("assetType", value)}
                              className="space-y-3"
                            >
                              <div className="flex items-center space-x-3 p-4 bg-muted/50 rounded-lg border border-border hover:border-primary/30 cursor-pointer">
                                <RadioGroupItem value="forex" id="forex" />
                                <Label htmlFor="forex" className="cursor-pointer flex-1 text-sm sm:text-base">
                                  Forex & CFDs
                                </Label>
                              </div>
                              <div className="flex items-center space-x-3 p-4 bg-muted/50 rounded-lg border border-border hover:border-primary/30 cursor-pointer">
                                <RadioGroupItem value="futures" id="futures" />
                                <Label htmlFor="futures" className="cursor-pointer flex-1 text-sm sm:text-base">
                                  Futures
                                </Label>
                              </div>
                              <div className="flex items-center space-x-3 p-4 bg-muted/50 rounded-lg border border-border hover:border-primary/30 cursor-pointer">
                                <RadioGroupItem value="crypto" id="crypto" />
                                <Label htmlFor="crypto" className="cursor-pointer flex-1 text-sm sm:text-base">
                                  Crypto
                                </Label>
                              </div>
                              <div className="flex items-center space-x-3 p-4 bg-muted/50 rounded-lg border border-border hover:border-primary/30 cursor-pointer">
                                <RadioGroupItem value="mixed" id="mixed" />
                                <Label htmlFor="mixed" className="cursor-pointer flex-1 text-sm sm:text-base">
                                  Multiple asset classes
                                </Label>
                              </div>
                            </RadioGroup>
                          </div>
                        )}

                        {smartMatchStep === 1 && (
                          <div className="space-y-5">
                            <h3 className="text-base sm:text-lg font-semibold text-foreground">
                              What's your pricing preference?
                            </h3>
                            <RadioGroup
                              value={smartMatchAnswers.pricingPreference}
                              onValueChange={(value) => handleSmartMatchAnswer("pricingPreference", value)}
                              className="space-y-3"
                            >
                              <div className="flex items-center space-x-3 p-4 bg-muted/50 rounded-lg border border-border hover:border-primary/30 cursor-pointer">
                                <RadioGroupItem value="spreads" id="spreads" />
                                <Label htmlFor="spreads" className="cursor-pointer flex-1 text-sm sm:text-base">
                                  Spread-only (no commission)
                                </Label>
                              </div>
                              <div className="flex items-center space-x-3 p-4 bg-muted/50 rounded-lg border border-border hover:border-primary/30 cursor-pointer">
                                <RadioGroupItem value="raw" id="raw" />
                                <Label htmlFor="raw" className="cursor-pointer flex-1 text-sm sm:text-base">
                                  Raw spreads + commission
                                </Label>
                              </div>
                              <div className="flex items-center space-x-3 p-4 bg-muted/50 rounded-lg border border-border hover:border-primary/30 cursor-pointer">
                                <RadioGroupItem value="nopreference" id="nopreference" />
                                <Label htmlFor="nopreference" className="cursor-pointer flex-1 text-sm sm:text-base">
                                  No preference
                                </Label>
                              </div>
                            </RadioGroup>
                          </div>
                        )}

                        {smartMatchStep === 2 && (
                          <div className="space-y-5">
                            <h3 className="text-base sm:text-lg font-semibold text-foreground">Account type?</h3>
                            <RadioGroup
                              value={smartMatchAnswers.accountType}
                              onValueChange={(value) => handleSmartMatchAnswer("accountType", value)}
                              className="space-y-3"
                            >
                              <div className="flex items-center space-x-3 p-4 bg-muted/50 rounded-lg border border-border hover:border-primary/30 cursor-pointer">
                                <RadioGroupItem value="personal" id="personal" />
                                <Label htmlFor="personal" className="cursor-pointer flex-1 text-sm sm:text-base">
                                  Personal brokerage account
                                </Label>
                              </div>
                              <div className="flex items-center space-x-3 p-4 bg-muted/50 rounded-lg border border-border hover:border-primary/30 cursor-pointer">
                                <RadioGroupItem value="funded" id="funded" />
                                <Label htmlFor="funded" className="cursor-pointer flex-1 text-sm sm:text-base">
                                  Funded/prop firm account
                                </Label>
                              </div>
                            </RadioGroup>
                          </div>
                        )}

                        {smartMatchStep === 3 && (
                          <div className="space-y-5">
                            <h3 className="text-base sm:text-lg font-semibold text-foreground">
                              What's most important to you?
                            </h3>
                            <RadioGroup
                              value={smartMatchAnswers.priority}
                              onValueChange={(value) => handleSmartMatchAnswer("priority", value)}
                              className="space-y-3"
                            >
                              <div className="flex items-center space-x-3 p-4 bg-muted/50 rounded-lg border border-border hover:border-primary/30 cursor-pointer">
                                <RadioGroupItem value="speed" id="speed" />
                                <Label htmlFor="speed" className="cursor-pointer flex-1 text-sm sm:text-base">
                                  Fast payouts
                                </Label>
                              </div>
                              <div className="flex items-center space-x-3 p-4 bg-muted/50 rounded-lg border border-border hover:border-primary/30 cursor-pointer">
                                <RadioGroupItem value="scaling" id="scaling" />
                                <Label htmlFor="scaling" className="cursor-pointer flex-1 text-sm sm:text-base">
                                  Scaling opportunities
                                </Label>
                              </div>
                              <div className="flex items-center space-x-3 p-4 bg-muted/50 rounded-lg border border-border hover:border-primary/30 cursor-pointer">
                                <RadioGroupItem value="cost" id="cost" />
                                <Label htmlFor="cost" className="cursor-pointer flex-1 text-sm sm:text-base">
                                  Lower fees/costs
                                </Label>
                              </div>
                              <div className="flex items-center space-x-3 p-4 bg-muted/50 rounded-lg border border-border hover:border-primary/30 cursor-pointer">
                                <RadioGroupItem value="flexibility" id="flexibility" />
                                <Label htmlFor="flexibility" className="cursor-pointer flex-1 text-sm sm:text-base">
                                  Flexible rules
                                </Label>
                              </div>
                            </RadioGroup>
                          </div>
                        )}

                        {/* Progress indicator */}
                        <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-border">
                          {[0, 1, 2, 3].map((step) => (
                            <div
                              key={step}
                              className={`w-2 h-2 rounded-full ${step <= smartMatchStep ? "bg-primary" : "bg-muted"}`}
                            />
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {smartMatchStep >= 4 && (
                    <div className="space-y-6">
                      <Card className="bg-card border-border">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                              Matching Providers
                            </CardTitle>
                            <Button variant="outline" size="sm" onClick={resetSmartMatch}>
                              Start Over
                            </Button>
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                            Based on your preferences. No ranking or recommendation implied.
                          </p>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {getMatchingProviders().map((provider: any) => (
                              <div
                                key={provider.name}
                                className="p-4 bg-muted/50 rounded-lg border border-border hover:border-primary/30 transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <span className="text-xl sm:text-2xl">{provider.logo}</span>
                                    <div>
                                      <h4 className="font-medium text-foreground text-sm sm:text-base">
                                        {provider.name}
                                      </h4>
                                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                                        {provider.instruments?.substring(0, 50) || provider.spreadModel}
                                        ...
                                      </p>
                                    </div>
                                  </div>
                                  <Button variant="ghost" size="sm" className="text-xs sm:text-sm">
                                    View Details
                                    <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Connect Account Modal */}
        <ConnectAccountModal open={showConnectModal} onOpenChange={setShowConnectModal} />
      </div>
    </div>
  );
}
