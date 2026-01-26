import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Bell, TrendingUp, AlertTriangle, Calendar, Moon, Volume2 } from "lucide-react";
import type { AlertPreferences } from "@/types/alerts";

interface AlertPreferencesPanelProps {
  preferences: AlertPreferences;
  onUpdate: (prefs: AlertPreferences) => void;
}

const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD'];
const offsetOptions = [60, 30, 15, 5];

export function AlertPreferencesPanel({ preferences, onUpdate }: AlertPreferencesPanelProps) {
  const [prefs, setPrefs] = useState<AlertPreferences>(preferences);

  const updatePref = <K extends keyof AlertPreferences>(key: K, value: AlertPreferences[K]) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    onUpdate(updated);
  };

  const toggleOffset = (offset: number) => {
    const offsets = prefs.sessionReminderOffsets.includes(offset)
      ? prefs.sessionReminderOffsets.filter(o => o !== offset)
      : [...prefs.sessionReminderOffsets, offset];
    updatePref('sessionReminderOffsets', offsets);
  };

  const toggleCurrency = (currency: string) => {
    const currencies = prefs.relevantCurrencies.includes(currency)
      ? prefs.relevantCurrencies.filter(c => c !== currency)
      : [...prefs.relevantCurrencies, currency];
    updatePref('relevantCurrencies', currencies);
  };

  const toggleTimeframe = (tf: 'H4' | 'Daily') => {
    const timeframes = prefs.biasFlipTimeframes.includes(tf)
      ? prefs.biasFlipTimeframes.filter(t => t !== tf)
      : [...prefs.biasFlipTimeframes, tf];
    updatePref('biasFlipTimeframes', timeframes);
  };

  return (
    <div className="space-y-4">
      {/* Session Alerts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Session Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="sessionReminders" className="text-sm">Session Open Reminders</Label>
            <Switch
              id="sessionReminders"
              checked={prefs.sessionReminders}
              onCheckedChange={(v) => updatePref('sessionReminders', v)}
            />
          </div>
          {prefs.sessionReminders && (
            <div className="pl-4 space-y-2">
              <Label className="text-xs text-muted-foreground">Reminder offsets (minutes before)</Label>
              <div className="flex flex-wrap gap-2">
                {offsetOptions.map(offset => (
                  <Badge
                    key={offset}
                    variant={prefs.sessionReminderOffsets.includes(offset) ? "default" : "outline"}
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
            <Label htmlFor="sessionOverlaps" className="text-sm">Session Overlap Alerts</Label>
            <Switch
              id="sessionOverlaps"
              checked={prefs.sessionOverlaps}
              onCheckedChange={(v) => updatePref('sessionOverlaps', v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="sessionStatus" className="text-sm">Session Open/Close Status</Label>
            <Switch
              id="sessionStatus"
              checked={prefs.sessionStatus}
              onCheckedChange={(v) => updatePref('sessionStatus', v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* News Alerts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            News & Events
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="highImpactNews" className="text-sm">High-Impact (Red) News</Label>
            <Switch
              id="highImpactNews"
              checked={prefs.highImpactNews}
              onCheckedChange={(v) => updatePref('highImpactNews', v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="breakingNews" className="text-sm">Breaking / Unscheduled News</Label>
            <Switch
              id="breakingNews"
              checked={prefs.breakingNews}
              onCheckedChange={(v) => updatePref('breakingNews', v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="postEventSummaries" className="text-sm">Post-Event Summaries</Label>
            <Switch
              id="postEventSummaries"
              checked={prefs.postEventSummaries}
              onCheckedChange={(v) => updatePref('postEventSummaries', v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Bias Alerts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Bias Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="biasFlipAlerts" className="text-sm">Bias Flip Alerts (Watchlist)</Label>
            <Switch
              id="biasFlipAlerts"
              checked={prefs.biasFlipAlerts}
              onCheckedChange={(v) => updatePref('biasFlipAlerts', v)}
            />
          </div>
          {prefs.biasFlipAlerts && (
            <div className="pl-4 space-y-2">
              <Label className="text-xs text-muted-foreground">Timeframes</Label>
              <div className="flex gap-2">
                {(['H4', 'Daily'] as const).map(tf => (
                  <Badge
                    key={tf}
                    variant={prefs.biasFlipTimeframes.includes(tf) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleTimeframe(tf)}
                  >
                    {tf}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <Label htmlFor="biasAlignmentAlerts" className="text-sm">Bias Alignment (H4 + Daily)</Label>
            <Switch
              id="biasAlignmentAlerts"
              checked={prefs.biasAlignmentAlerts}
              onCheckedChange={(v) => updatePref('biasAlignmentAlerts', v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="dailySummary" className="text-sm">Daily Bias Summary</Label>
            <Switch
              id="dailySummary"
              checked={prefs.dailySummary}
              onCheckedChange={(v) => updatePref('dailySummary', v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="weeklySummary" className="text-sm">Weekly Bias Summary</Label>
            <Switch
              id="weeklySummary"
              checked={prefs.weeklySummary}
              onCheckedChange={(v) => updatePref('weeklySummary', v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Risk Alerts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-primary" />
            Risk Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="preNewsExposure" className="text-sm">Pre-News Exposure Warnings</Label>
            <Switch
              id="preNewsExposure"
              checked={prefs.preNewsExposure}
              onCheckedChange={(v) => updatePref('preNewsExposure', v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="lowLiquidity" className="text-sm">Low-Liquidity / No-Trade Alerts</Label>
            <Switch
              id="lowLiquidity"
              checked={prefs.lowLiquidity}
              onCheckedChange={(v) => updatePref('lowLiquidity', v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Moon className="h-4 w-4 text-primary" />
            Quiet Hours
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="quietHoursEnabled" className="text-sm">Enable Quiet Hours</Label>
            <Switch
              id="quietHoursEnabled"
              checked={prefs.quietHoursEnabled}
              onCheckedChange={(v) => updatePref('quietHoursEnabled', v)}
            />
          </div>
          {prefs.quietHoursEnabled && (
            <div className="grid grid-cols-2 gap-4 pl-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Start</Label>
                <Select value={prefs.quietHoursStart} onValueChange={(v) => updatePref('quietHoursStart', v)}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => (
                      <SelectItem key={i} value={`${i.toString().padStart(2, '0')}:00`}>
                        {`${i.toString().padStart(2, '0')}:00`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">End</Label>
                <Select value={prefs.quietHoursEnd} onValueChange={(v) => updatePref('quietHoursEnd', v)}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => (
                      <SelectItem key={i} value={`${i.toString().padStart(2, '0')}:00`}>
                        {`${i.toString().padStart(2, '0')}:00`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Currency Relevance */}
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
            {currencies.map(currency => (
              <Badge
                key={currency}
                variant={prefs.relevantCurrencies.includes(currency) ? "default" : "outline"}
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
