import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Bell, TrendingUp, AlertTriangle, Calendar, Moon } from "lucide-react";
import type { AlertPreferences } from "@/types/alerts";

interface AlertPreferencesPanelProps {
  preferences: AlertPreferences;
  onUpdate: (prefs: AlertPreferences) => void;
}

const currencies = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD"];
const offsetOptions = [60, 30, 15, 5];
const biasTimeframes: Array<"H4" | "Daily"> = ["H4", "Daily"];

export function AlertPreferencesPanel({ preferences, onUpdate }: AlertPreferencesPanelProps) {
  const updatePref = <K extends keyof AlertPreferences>(key: K, value: AlertPreferences[K]) => {
    onUpdate({ ...preferences, [key]: value });
  };

  const toggleOffset = (offset: number) => {
    const nextOffsets = preferences.sessionReminderOffsets.includes(offset)
      ? preferences.sessionReminderOffsets.filter((value) => value !== offset)
      : [...preferences.sessionReminderOffsets, offset].sort((a, b) => b - a);

    updatePref("sessionReminderOffsets", nextOffsets);
  };

  const toggleCurrency = (currency: string) => {
    const nextCurrencies = preferences.relevantCurrencies.includes(currency)
      ? preferences.relevantCurrencies.filter((value) => value !== currency)
      : [...preferences.relevantCurrencies, currency].sort();

    updatePref("relevantCurrencies", nextCurrencies);
  };

  const toggleTimeframe = (timeframe: "H4" | "Daily") => {
    const nextTimeframes = preferences.biasFlipTimeframes.includes(timeframe)
      ? preferences.biasFlipTimeframes.filter((value) => value !== timeframe)
      : [...preferences.biasFlipTimeframes, timeframe];

    updatePref("biasFlipTimeframes", nextTimeframes);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Session Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="sessionReminders" className="text-sm">
              Session Open Reminders
            </Label>
            <Switch
              id="sessionReminders"
              checked={preferences.sessionReminders}
              onCheckedChange={(value) => updatePref("sessionReminders", value)}
            />
          </div>

          {preferences.sessionReminders && (
            <div className="pl-4 space-y-2">
              <Label className="text-xs text-muted-foreground">Reminder offsets (minutes before)</Label>
              <div className="flex flex-wrap gap-2">
                {offsetOptions.map((offset) => (
                  <Badge
                    key={offset}
                    variant={preferences.sessionReminderOffsets.includes(offset) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleOffset(offset)}
                  >
                    {offset}m
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label htmlFor="sessionOverlaps" className="text-sm">
              Session Overlap Alerts
            </Label>
            <Switch
              id="sessionOverlaps"
              checked={preferences.sessionOverlaps}
              onCheckedChange={(value) => updatePref("sessionOverlaps", value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="sessionStatus" className="text-sm">
              Session Open/Close Status
            </Label>
            <Switch
              id="sessionStatus"
              checked={preferences.sessionStatus}
              onCheckedChange={(value) => updatePref("sessionStatus", value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            News & Events
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="highImpactNews" className="text-sm">
              High-Impact (Red) News
            </Label>
            <Switch
              id="highImpactNews"
              checked={preferences.highImpactNews}
              onCheckedChange={(value) => updatePref("highImpactNews", value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="breakingNews" className="text-sm">
              Breaking / Unscheduled News
            </Label>
            <Switch
              id="breakingNews"
              checked={preferences.breakingNews}
              onCheckedChange={(value) => updatePref("breakingNews", value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="postEventSummaries" className="text-sm">
              Post-Event Summaries
            </Label>
            <Switch
              id="postEventSummaries"
              checked={preferences.postEventSummaries}
              onCheckedChange={(value) => updatePref("postEventSummaries", value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Bias Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="biasFlipAlerts" className="text-sm">
              Bias Flip Alerts (Watchlist)
            </Label>
            <Switch
              id="biasFlipAlerts"
              checked={preferences.biasFlipAlerts}
              onCheckedChange={(value) => updatePref("biasFlipAlerts", value)}
            />
          </div>

          {preferences.biasFlipAlerts && (
            <div className="pl-4 space-y-2">
              <Label className="text-xs text-muted-foreground">Timeframes</Label>
              <div className="flex gap-2">
                {biasTimeframes.map((timeframe) => (
                  <Badge
                    key={timeframe}
                    variant={preferences.biasFlipTimeframes.includes(timeframe) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleTimeframe(timeframe)}
                  >
                    {timeframe}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label htmlFor="biasAlignmentAlerts" className="text-sm">
              Bias Alignment (H4 + Daily)
            </Label>
            <Switch
              id="biasAlignmentAlerts"
              checked={preferences.biasAlignmentAlerts}
              onCheckedChange={(value) => updatePref("biasAlignmentAlerts", value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="dailySummary" className="text-sm">
              Daily Bias Summary
            </Label>
            <Switch
              id="dailySummary"
              checked={preferences.dailySummary}
              onCheckedChange={(value) => updatePref("dailySummary", value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="weeklySummary" className="text-sm">
              Weekly Bias Summary
            </Label>
            <Switch
              id="weeklySummary"
              checked={preferences.weeklySummary}
              onCheckedChange={(value) => updatePref("weeklySummary", value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-primary" />
            Risk Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="preNewsExposure" className="text-sm">
              Pre-News Exposure Warnings
            </Label>
            <Switch
              id="preNewsExposure"
              checked={preferences.preNewsExposure}
              onCheckedChange={(value) => updatePref("preNewsExposure", value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="lowLiquidity" className="text-sm">
              Low-Liquidity / No-Trade Alerts
            </Label>
            <Switch
              id="lowLiquidity"
              checked={preferences.lowLiquidity}
              onCheckedChange={(value) => updatePref("lowLiquidity", value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Moon className="h-4 w-4 text-primary" />
            Quiet Hours
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="quietHoursEnabled" className="text-sm">
              Enable Quiet Hours
            </Label>
            <Switch
              id="quietHoursEnabled"
              checked={preferences.quietHoursEnabled}
              onCheckedChange={(value) => updatePref("quietHoursEnabled", value)}
            />
          </div>

          {preferences.quietHoursEnabled && (
            <div className="grid grid-cols-2 gap-4 pl-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Start</Label>
                <Select
                  value={preferences.quietHoursStart}
                  onValueChange={(value) => updatePref("quietHoursStart", value)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, index) => {
                      const value = `${index.toString().padStart(2, "0")}:00`;
                      return (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">End</Label>
                <Select value={preferences.quietHoursEnd} onValueChange={(value) => updatePref("quietHoursEnd", value)}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, index) => {
                      const value = `${index.toString().padStart(2, "0")}:00`;
                      return (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            Currency Relevance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Select currencies to receive alerts for (additive to watchlist currencies)
          </p>
          <div className="flex flex-wrap gap-2">
            {currencies.map((currency) => (
              <Badge
                key={currency}
                variant={preferences.relevantCurrencies.includes(currency) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleCurrency(currency)}
              >
                {currency}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
