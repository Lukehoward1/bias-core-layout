import { useState } from "react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, startOfYear } from "date-fns";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface DateRange {
  from: Date;
  to: Date;
  label: string;
}

interface ReportDateRangeFilterProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  firstTradeDate?: Date;
  lastTradeDate?: Date;
}

const presets = [
  { label: "This Week", getValue: () => ({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) }) },
  { label: "This Month", getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: "Last Month", getValue: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: "Last 3 Months", getValue: () => ({ from: startOfMonth(subMonths(new Date(), 2)), to: endOfMonth(new Date()) }) },
  { label: "Year to Date", getValue: () => ({ from: startOfYear(new Date()), to: new Date() }) },
  { label: "This Year", getValue: () => ({ from: startOfYear(new Date()), to: endOfMonth(new Date()) }) },
];

export function ReportDateRangeFilter({ 
  dateRange, 
  onDateRangeChange, 
  firstTradeDate, 
  lastTradeDate 
}: ReportDateRangeFilterProps) {
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState<Date | undefined>(dateRange.from);
  const [customTo, setCustomTo] = useState<Date | undefined>(dateRange.to);

  const handlePresetSelect = (preset: typeof presets[0]) => {
    const { from, to } = preset.getValue();
    onDateRangeChange({ from, to, label: preset.label });
  };

  const handleAllTime = () => {
    if (firstTradeDate && lastTradeDate) {
      onDateRangeChange({ from: firstTradeDate, to: lastTradeDate, label: "All Time" });
    } else {
      const from = startOfYear(subMonths(new Date(), 12));
      onDateRangeChange({ from, to: new Date(), label: "All Time" });
    }
  };

  const handleCustomApply = () => {
    if (customFrom && customTo) {
      onDateRangeChange({ 
        from: customFrom, 
        to: customTo, 
        label: `${format(customFrom, 'MMM d')} - ${format(customTo, 'MMM d, yyyy')}` 
      });
      setIsCustomOpen(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground hidden sm:inline">Date Range:</span>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-2 text-xs">
            <CalendarIcon className="h-3.5 w-3.5" />
            <span className="max-w-[140px] truncate">{dateRange.label}</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {presets.map((preset) => (
            <DropdownMenuItem 
              key={preset.label}
              onClick={() => handlePresetSelect(preset)}
              className={cn(
                "text-sm cursor-pointer",
                dateRange.label === preset.label && "bg-accent"
              )}
            >
              {preset.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem 
            onClick={handleAllTime}
            className={cn(
              "text-sm cursor-pointer",
              dateRange.label === "All Time" && "bg-accent"
            )}
          >
            All Time
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => setIsCustomOpen(true)}
            className="text-sm cursor-pointer"
          >
            Custom Range...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Custom Range Popover */}
      <Popover open={isCustomOpen} onOpenChange={setIsCustomOpen}>
        <PopoverTrigger asChild>
          <span className="hidden" />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="end">
          <div className="space-y-4">
            <div className="text-sm font-medium">Select Custom Range</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">From</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full justify-start text-left text-xs">
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {customFrom ? format(customFrom, "MMM d, yyyy") : "Select"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customFrom}
                      onSelect={setCustomFrom}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">To</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full justify-start text-left text-xs">
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {customTo ? format(customTo, "MMM d, yyyy") : "Select"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customTo}
                      onSelect={setCustomTo}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <Button size="sm" className="w-full" onClick={handleCustomApply} disabled={!customFrom || !customTo}>
              Apply Range
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
