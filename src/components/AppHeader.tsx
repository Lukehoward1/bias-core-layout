import React, { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown, User, LogOut, Sparkles, Lock,
  TrendingUp, TrendingDown, Minus,
  BookOpen, Zap, FileText,
  LayoutDashboard, BarChart2, BookText, Shield, Calendar as CalendarIcon, Settings as SettingsIcon,
} from "lucide-react";
import { useSessionLock } from "@/hooks/use-session-lock";
import { useAuth } from "@/contexts/AuthContext";
import { WHITELIST_SYMBOLS } from "@/services/candleData";
import { ASSET_BY_SYMBOL } from "@/data/asset-registry";
import { articles, tips } from "@/data/educationContent";
import { useMarketData } from "@/context/MarketDataProvider";
import type { MarketDirection } from "@/services/marketData";

// ── Types ─────────────────────────────────────────────────────────────────────

type AssetResult = { kind: "asset"; symbol: string; name: string; category: string; direction?: MarketDirection };
type GuideResult = { kind: "article" | "tip"; id: string; title: string; description: string };
type PageResult  = { kind: "page"; label: string; path: string };
type SearchResult = AssetResult | GuideResult | PageResult;

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGES: { label: string; path: string }[] = [
  { label: "Dashboard",  path: "/" },
  { label: "Markets",    path: "/markets" },
  { label: "Journal",    path: "/journal" },
  { label: "Risk Tools", path: "/risk-tools" },
  { label: "Calendar",   path: "/calendar" },
  { label: "Settings",   path: "/settings" },
];

function pageIcon(label: string) {
  switch (label) {
    case "Dashboard":  return <LayoutDashboard className="h-3.5 w-3.5" />;
    case "Markets":    return <BarChart2 className="h-3.5 w-3.5" />;
    case "Journal":    return <BookText className="h-3.5 w-3.5" />;
    case "Risk Tools": return <Shield className="h-3.5 w-3.5" />;
    case "Calendar":   return <CalendarIcon className="h-3.5 w-3.5" />;
    case "Settings":   return <SettingsIcon className="h-3.5 w-3.5" />;
    default:           return <FileText className="h-3.5 w-3.5" />;
  }
}

// ── SmartSearch ───────────────────────────────────────────────────────────────

function SmartSearch() {
  const navigate = useNavigate();
  const { quotes, subscribeSymbols } = useMarketData();

  const [query, setQuery]       = useState("");
  const [open, setOpen]         = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);

  // Subscribe to all whitelisted symbols so quotes are available on first search
  useEffect(() => { subscribeSymbols(WHITELIST_SYMBOLS); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Click-outside closes dropdown
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  // Compute grouped results
  const groups = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return { assets: [] as AssetResult[], guides: [] as GuideResult[], pages: [] as PageResult[] };

    const assets: AssetResult[] = WHITELIST_SYMBOLS
      .filter(sym => {
        const asset = ASSET_BY_SYMBOL[sym];
        return sym.toLowerCase().includes(q) || (asset?.name ?? "").toLowerCase().includes(q);
      })
      .slice(0, 3)
      .map(sym => ({
        kind: "asset" as const,
        symbol: sym,
        name: ASSET_BY_SYMBOL[sym]?.name ?? sym,
        category: ASSET_BY_SYMBOL[sym]?.category ?? "",
        direction: quotes[sym]?.direction,
      }));

    const guides: GuideResult[] = [
      ...articles
        .filter(a =>
          a.title.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.tags.some(t => t.toLowerCase().includes(q))
        )
        .map(a => ({ kind: "article" as const, id: a.id, title: a.title, description: a.description })),
      ...tips
        .filter(t =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some(tag => tag.toLowerCase().includes(q))
        )
        .map(t => ({ kind: "tip" as const, id: t.id, title: t.title, description: t.description })),
    ].slice(0, 3);

    const pages: PageResult[] = PAGES
      .filter(p => p.label.toLowerCase().includes(q))
      .slice(0, 3)
      .map(p => ({ kind: "page" as const, label: p.label, path: p.path }));

    return { assets, guides, pages };
  }, [query, quotes]);

  // Flat list in display order for keyboard navigation
  const flatResults = [...groups.assets, ...groups.guides, ...groups.pages];
  const hasResults  = flatResults.length > 0;

  // Reset active index whenever results change
  useEffect(() => { setActiveIdx(0); }, [query]);

  function go(result: SearchResult) {
    setQuery("");
    setOpen(false);
    if (result.kind === "asset")   { navigate(`/asset/${result.symbol}`); return; }
    if (result.kind === "article") { navigate(`/education?article=${result.id}`); return; }
    if (result.kind === "tip")     { navigate(`/education?view=tips&tip=${result.id}`); return; }
    navigate(result.path);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || !hasResults) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      const item = flatResults[activeIdx];
      if (item) go(item);
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  function directionBadge(direction?: MarketDirection) {
    if (direction === "up")   return <TrendingUp   className="h-3 w-3 text-success shrink-0" />;
    if (direction === "down") return <TrendingDown  className="h-3 w-3 text-destructive shrink-0" />;
    if (direction === "flat") return <Minus         className="h-3 w-3 text-muted-foreground shrink-0" />;
    return null;
  }

  const showDropdown = open && hasResults;

  return (
    <div ref={containerRef} className="relative flex-1 max-w-xl hidden md:block">
      <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
      <Input
        ref={inputRef}
        type="text"
        placeholder="Search assets, guides, pages..."
        value={query}
        onChange={e => {
          setQuery(e.target.value);
          setOpen(e.target.value.length > 0);
        }}
        onFocus={() => { if (query.length > 0) setOpen(true); }}
        onKeyDown={handleKeyDown}
        className="pl-10 h-9 bg-muted/50 border-muted text-sm"
        autoComplete="off"
      />

      {showDropdown && (
        <div
          className="absolute top-full mt-1 w-full bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden"
          onMouseDown={e => e.preventDefault()} // prevent input blur on click
        >
          {/* Assets */}
          {groups.assets.length > 0 && (
            <div>
              <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Assets
              </p>
              {groups.assets.map((r, i) => {
                const gi = i;
                return (
                  <button
                    key={r.symbol}
                    type="button"
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors ${gi === activeIdx ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"}`}
                    onMouseEnter={() => setActiveIdx(gi)}
                    onClick={() => go(r)}
                  >
                    <BarChart2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="font-medium">{r.symbol}</span>
                    <span className="text-muted-foreground text-xs truncate">{r.name}</span>
                    <span className="ml-auto">{directionBadge(r.direction)}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Guides & Tips */}
          {groups.guides.length > 0 && (
            <div>
              {(groups.assets.length > 0) && <div className="border-t border-border/50 mx-3" />}
              <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Guides & Tips
              </p>
              {groups.guides.map((r, i) => {
                const gi = groups.assets.length + i;
                return (
                  <button
                    key={r.id}
                    type="button"
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors ${gi === activeIdx ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"}`}
                    onMouseEnter={() => setActiveIdx(gi)}
                    onClick={() => go(r)}
                  >
                    {r.kind === "article"
                      ? <BookOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      : <Zap      className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                    <span className="font-medium truncate">{r.title}</span>
                    <Badge variant="outline" className="ml-auto text-[10px] shrink-0 capitalize">{r.kind}</Badge>
                  </button>
                );
              })}
            </div>
          )}

          {/* Pages */}
          {groups.pages.length > 0 && (
            <div>
              {(groups.assets.length > 0 || groups.guides.length > 0) && (
                <div className="border-t border-border/50 mx-3" />
              )}
              <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Pages
              </p>
              {groups.pages.map((r, i) => {
                const gi = groups.assets.length + groups.guides.length + i;
                return (
                  <button
                    key={r.path}
                    type="button"
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors ${gi === activeIdx ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"}`}
                    onMouseEnter={() => setActiveIdx(gi)}
                    onClick={() => go(r)}
                  >
                    <span className="text-muted-foreground shrink-0">{pageIcon(r.label)}</span>
                    <span className="font-medium">{r.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="h-1.5" />
        </div>
      )}
    </div>
  );
}

// ── AppHeader ─────────────────────────────────────────────────────────────────

interface AppHeaderProps {
  title: string;
  rightContent?: React.ReactNode;
}

export function AppHeader({ title, rightContent }: AppHeaderProps) {
  const { lock } = useSessionLock();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const userEmail = user?.email ?? "";
  const avatarInitials = userEmail ? userEmail.slice(0, 2).toUpperCase() : "?";
  const displayEmail = userEmail.length > 28 ? `${userEmail.slice(0, 26)}…` : userEmail;

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  return (
    <header
      className="
    h-14 sticky top-0 z-30
    border-b border-border
    bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60
    flex items-center justify-between px-6 gap-6 shrink-0
  "
    >
      <h1 className="text-xl font-semibold text-foreground shrink-0">{title}</h1>

      {/* Global Smart Search */}
      <SmartSearch />

      <div className="flex items-center gap-4 shrink-0">
        {rightContent}
        <Badge variant="secondary" className="text-xs font-medium h-6 px-2.5">
          Pro
        </Badge>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                {avatarInitials}
              </AvatarFallback>
            </Avatar>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="py-2">
              <div className="flex flex-col space-y-1">
                <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="py-2">
              <User className="mr-2.5 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="py-2" onClick={lock}>
              <Lock className="mr-2.5 h-4 w-4" />
              Lock now
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="py-2" onClick={handleSignOut}>
              <LogOut className="mr-2.5 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
