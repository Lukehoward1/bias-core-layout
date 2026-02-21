import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Search, TrendingUp, TrendingDown, Star } from "lucide-react";
import { PdfExportButton } from "./PdfExportButton";
import { usePdfExport } from "@/hooks/use-pdf-export";
import { useLinkedAccounts } from "@/hooks/use-linked-accounts";

interface Trade {
  id: string;
  date: string;
  pair: string;
  type: "Long" | "Short";
  entry: number;
  exit: number;
  lots: number;
  pnl: number;
  status: string;
  notes?: string;
  rating?: number;

  // ✅ NEW: link trades to a connected account
  // (optional for backward compatibility)
  accountId?: string;
}

interface ReportsTradeLogProps {
  trades: Trade[];
  dateRangeLabel: string;
}

type SortOption = "date-desc" | "date-asc" | "pnl-desc" | "pnl-asc" | "rating-desc" | "rating-asc";

/**
 * Account filter options:
 * - "all"
 * - "primary"
 * - "account:<id>"
 * - "unknown" (trades with no accountId)
 */
type AccountFilter = "all" | "primary" | "unknown" | `account:${string}`;

export function ReportsTradeLog({ trades, dateRangeLabel }: ReportsTradeLogProps) {
  const { exportToPdf } = usePdfExport();
  const { accounts, primaryAccount } = useLinkedAccounts();

  // Summary stats for PDF payload
  const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
  const winningTrades = trades.filter((t) => t.pnl > 0);
  const losingTrades = trades.filter((t) => t.pnl < 0);
  const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;
  const avgWin = winningTrades.length > 0 ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length : 0;
  const avgLoss =
    losingTrades.length > 0 ? Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length) : 1;
  const avgRR = avgLoss > 0 ? avgWin / avgLoss : 0;

  const handleExport = () => {
    exportToPdf("reports-tradelog", {
      filename: `StreamBias-TradeLog-${new Date().toISOString().split("T")[0]}`,
      title: "Trade Log Report",
      dateRange: dateRangeLabel,
      userName: "John Trader",
      trades: {
        totalPnl,
        winRate,
        avgRR,
        tradeCount: trades.length,
        bestDay: null,
        worstDay: null,
      },
    });
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [pairFilter, setPairFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [pnlFilter, setPnlFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("date-desc");

  // ✅ NEW
  const [accountFilter, setAccountFilter] = useState<AccountFilter>("all");

  const uniquePairs = useMemo(() => [...new Set(trades.map((t) => t.pair))], [trades]);

  const accountNameById = useMemo(() => {
    const map = new Map<string, string>();
    accounts.forEach((a) => map.set(a.id, a.name));
    return map;
  }, [accounts]);

  const filteredTrades = useMemo(() => {
    let result = [...trades];

    // ✅ Account filter
    if (accountFilter !== "all") {
      if (accountFilter === "primary") {
        const pid = primaryAccount?.id;
        if (pid) result = result.filter((t) => t.accountId === pid);
        else result = []; // no primary => nothing matches
      } else if (accountFilter === "unknown") {
        result = result.filter((t) => !t.accountId);
      } else if (accountFilter.startsWith("account:")) {
        const id = accountFilter.split(":")[1];
        result = result.filter((t) => t.accountId === id);
      }
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.pair.toLowerCase().includes(query) ||
          t.date.includes(query) ||
          (t.notes?.toLowerCase().includes(query) ?? false) ||
          (t.accountId ? (accountNameById.get(t.accountId) || "").toLowerCase().includes(query) : false),
      );
    }

    // Pair filter
    if (pairFilter !== "all") {
      result = result.filter((t) => t.pair === pairFilter);
    }

    // Rating filter
    if (ratingFilter !== "all") {
      const rating = parseInt(ratingFilter, 10);
      result = result.filter((t) => t.rating === rating);
    }

    // P&L filter
    if (pnlFilter === "positive") {
      result = result.filter((t) => t.pnl > 0);
    } else if (pnlFilter === "negative") {
      result = result.filter((t) => t.pnl < 0);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return b.date.localeCompare(a.date);
        case "date-asc":
          return a.date.localeCompare(b.date);
        case "pnl-desc":
          return b.pnl - a.pnl;
        case "pnl-asc":
          return a.pnl - b.pnl;
        case "rating-desc":
          return (b.rating || 0) - (a.rating || 0);
        case "rating-asc":
          return (a.rating || 0) - (b.rating || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [
    trades,
    accountFilter,
    primaryAccount?.id,
    accountNameById,
    searchQuery,
    pairFilter,
    ratingFilter,
    pnlFilter,
    sortBy,
  ]);

  const exportToCSV = () => {
    const headers = ["Date", "Account", "Pair", "Type", "Entry", "Exit", "Lots", "P&L", "Status", "Rating", "Notes"];

    const rows = filteredTrades.map((t) => [
      t.date,
      t.accountId ? accountNameById.get(t.accountId) || t.accountId : "Unknown",
      t.pair,
      t.type,
      t.entry,
      t.exit,
      t.lots,
      t.pnl,
      t.status,
      t.rating || "",
      t.notes || "",
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trade-log-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const profit = filteredTrades.filter((t) => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
  const loss = Math.abs(filteredTrades.filter((t) => t.pnl < 0).reduce((s, t) => s + t.pnl, 0));

  return (
    <div id="reports-tradelog" className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Filters & Search</CardTitle>
            <div className="flex items-center gap-2" data-pdf-exclude>
              <PdfExportButton onClick={handleExport} />
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="col-span-2 md:col-span-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* ✅ NEW: Account filter */}
            <Select value={accountFilter} onValueChange={(v) => setAccountFilter(v as AccountFilter)}>
              <SelectTrigger>
                <SelectValue placeholder="Account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                <SelectItem value="primary" disabled={!primaryAccount}>
                  Primary Account
                </SelectItem>
                <SelectItem value="unknown">Unknown / Unassigned</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={`account:${a.id}`}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={pairFilter} onValueChange={setPairFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Pair" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Pairs</SelectItem>
                {uniquePairs.map((pair) => (
                  <SelectItem key={pair} value={pair}>
                    {pair}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="5">5 Stars</SelectItem>
                <SelectItem value="4">4 Stars</SelectItem>
                <SelectItem value="3">3 Stars</SelectItem>
                <SelectItem value="2">2 Stars</SelectItem>
                <SelectItem value="1">1 Star</SelectItem>
              </SelectContent>
            </Select>

            <Select value={pnlFilter} onValueChange={setPnlFilter}>
              <SelectTrigger>
                <SelectValue placeholder="P&L" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All P&L</SelectItem>
                <SelectItem value="positive">Winners Only</SelectItem>
                <SelectItem value="negative">Losers Only</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Date (Newest)</SelectItem>
                <SelectItem value="date-asc">Date (Oldest)</SelectItem>
                <SelectItem value="pnl-desc">Best P&L</SelectItem>
                <SelectItem value="pnl-asc">Worst P&L</SelectItem>
                <SelectItem value="rating-desc">Highest Rating</SelectItem>
                <SelectItem value="rating-asc">Lowest Rating</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{filteredTrades.length} trades found</span>
        <span>|</span>
        <span className="text-success">+£{profit.toLocaleString()} profit</span>
        <span className="text-destructive">-£{loss.toLocaleString()} loss</span>
      </div>

      {/* Trade Table */}
      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Date</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Account</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Pair</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Type</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Entry</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Exit</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Lots</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">P&L</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Rating</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground min-w-[150px]">Notes</th>
                </tr>
              </thead>

              <tbody>
                {filteredTrades.map((trade) => {
                  const accName = trade.accountId ? accountNameById.get(trade.accountId) || "Account" : "Unknown";

                  return (
                    <tr key={trade.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-3 text-sm text-muted-foreground">{trade.date}</td>

                      <td className="py-3 px-3">
                        <Badge variant="secondary" className="text-xs">
                          {accName}
                          {primaryAccount?.id && trade.accountId === primaryAccount.id ? " (Primary)" : ""}
                        </Badge>
                      </td>

                      <td className="py-3 px-3">
                        <Badge variant="outline" className="text-xs">
                          {trade.pair}
                        </Badge>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          {trade.type === "Long" ? (
                            <TrendingUp className="h-3.5 w-3.5 text-success" />
                          ) : (
                            <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                          )}
                          <span className="text-sm text-foreground">{trade.type}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-sm text-foreground">{trade.entry}</td>
                      <td className="py-3 px-3 text-sm text-foreground">{trade.exit}</td>
                      <td className="py-3 px-3 text-sm text-foreground">{trade.lots}</td>

                      <td className="py-3 px-3">
                        <span className={`text-sm font-medium ${trade.pnl >= 0 ? "text-success" : "text-destructive"}`}>
                          {trade.pnl >= 0 ? "+" : ""}£{trade.pnl.toLocaleString()}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        {trade.rating ? (
                          <div className="flex gap-0.5">
                            {[...Array(trade.rating)].map((_, i) => (
                              <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <span className="text-xs text-muted-foreground truncate max-w-[150px] block">
                          {trade.notes || "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredTrades.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No trades match your filters</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
