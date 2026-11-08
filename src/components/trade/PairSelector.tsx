// src/components/trade/PairSelector.tsx
// Dropdown selector for Trade screen (plan §2.4).
//
// Behaviour:
//   - Lists TRADE_INSTRUMENTS; watchlisted symbols float to the top,
//     alphabetical within group.
//   - Clicking an item navigates via `onSelect`.
//   - Star toggle updates the watchlist via useWatchlist.
//   - A bias arrow renders only when a `MarketContext` exists for the symbol
//     (no per-symbol fetches on open).

import { useMemo, useState } from "react";
import { ChevronDown, Star, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { TRADE_INSTRUMENTS, type TradeInstrument } from "@/data/tradeInstruments";
import { useWatchlist } from "@/hooks/use-watchlist";
import type { MarketContext } from "@/services/contextEngine";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

export interface PairSelectorProps {
  currentSymbol: string | null;
  onSelect: (symbol: string) => void;
  /** Lookup used to show a bias arrow if the context has been built for a symbol. */
  getContextForSymbol?: (symbol: string) => MarketContext | undefined;
}

function BiasArrow({ context }: { context: MarketContext | undefined }) {
  if (!context) return null;
  if (context.biasState.startsWith("Bullish")) {
    return <TrendingUp className="h-3.5 w-3.5 text-success" />;
  }
  if (context.biasState.startsWith("Bearish")) {
    return <TrendingDown className="h-3.5 w-3.5 text-destructive" />;
  }
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
}

export function PairSelector({ currentSymbol, onSelect, getContextForSymbol }: PairSelectorProps) {
  const { isInWatchlist, toggleWatchlist } = useWatchlist();
  const [open, setOpen] = useState(false);

  const grouped = useMemo(() => {
    const starred: TradeInstrument[] = [];
    const rest: TradeInstrument[] = [];
    for (const inst of TRADE_INSTRUMENTS) {
      if (isInWatchlist(inst.symbol)) starred.push(inst);
      else rest.push(inst);
    }
    const sortFn = (a: TradeInstrument, b: TradeInstrument) => a.symbol.localeCompare(b.symbol);
    starred.sort(sortFn);
    rest.sort(sortFn);
    return { starred, rest };
  }, [isInWatchlist]);

  const current = currentSymbol
    ? TRADE_INSTRUMENTS.find((i) => i.symbol === currentSymbol.toUpperCase())
    : undefined;

  const handleSelect = (symbol: string) => {
    setOpen(false);
    onSelect(symbol);
  };

  const Row = ({ inst }: { inst: TradeInstrument }) => {
    const isActive = currentSymbol?.toUpperCase() === inst.symbol;
    const starred = isInWatchlist(inst.symbol);
    const ctx = getContextForSymbol?.(inst.symbol);
    return (
      <div
        className={`flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/60 cursor-pointer ${
          isActive ? "bg-muted/60" : ""
        }`}
        onClick={() => handleSelect(inst.symbol)}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleWatchlist(inst.symbol);
          }}
          className="p-0.5 rounded hover:bg-muted"
          aria-label={starred ? "Remove from watchlist" : "Add to watchlist"}
        >
          <Star
            className={`h-3.5 w-3.5 ${starred ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
          />
        </button>
        <span className="text-sm font-medium text-foreground flex-1">{inst.displayName}</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{inst.category}</span>
        <BiasArrow context={ctx} />
      </div>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9 gap-2 px-3">
          <span className="font-semibold">{current ? current.displayName : currentSymbol ?? "Select pair"}</span>
          <ChevronDown className="h-4 w-4 opacity-70" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[320px] p-2">
        {grouped.starred.length > 0 && (
          <div className="mb-2">
            <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              Watchlist
            </div>
            <div className="space-y-0.5">
              {grouped.starred.map((inst) => (
                <Row key={inst.symbol} inst={inst} />
              ))}
            </div>
          </div>
        )}
        <div>
          {grouped.starred.length > 0 && (
            <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              All instruments
            </div>
          )}
          <div className="space-y-0.5 max-h-[320px] overflow-y-auto">
            {grouped.rest.map((inst) => (
              <Row key={inst.symbol} inst={inst} />
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
