import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { resetConsentStatus } from "@/lib/cookieConsent";
import { Button } from "@/components/ui/button";
import {
  AreaChart, Area, ResponsiveContainer, XAxis,
  BarChart, Bar, Cell, YAxis,
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import sbLogo from "@/assets/sb-logo.svg";
import {
  ChevronDown, Play, UserPlus, BarChart2, TrendingUp,
  Gem, Bitcoin, LineChart,
} from "lucide-react";
import { submitDemoLead } from "@/lib/demoLeads";

// ── Static data ────────────────────────────────────────────────────────────────

const EQUITY_DATA = [
  { d: "Jan", v: 10000 }, { d: "Feb", v: 10420 }, { d: "Mar", v: 10210 },
  { d: "Apr", v: 10890 }, { d: "May", v: 11340 }, { d: "Jun", v: 11180 },
  { d: "Jul", v: 11820 }, { d: "Aug", v: 12350 }, { d: "Sep", v: 12100 },
  { d: "Oct", v: 13050 }, { d: "Nov", v: 13480 }, { d: "Dec", v: 14200 },
];

const ROLLING_DATA = [
  { w: "W1", pnl: 1240 }, { w: "W2", pnl: 890  }, { w: "W3", pnl: -420 },
  { w: "W4", pnl: 1680 }, { w: "W5", pnl: 560  }, { w: "W6", pnl: -180 },
  { w: "W7", pnl: 2100 }, { w: "W8", pnl: 1450 },
];

type CalDay = { d: number | null; pnl?: number | null; weekend?: boolean };

const CALENDAR_WEEKS: CalDay[][] = [
  [
    { d: 1, pnl:  420 }, { d: 2, pnl:  180 }, { d: 3, pnl: -290 }, { d: 4, pnl: 650 }, { d: 5, pnl:  120 },
    { d: 6, weekend: true }, { d: 7, weekend: true },
  ],
  [
    { d: 8, pnl: -180 }, { d: 9, pnl:  890 }, { d: 10, pnl: 340 }, { d: 11, pnl: -120 }, { d: 12, pnl: 560 },
    { d: 13, weekend: true }, { d: 14, weekend: true },
  ],
  [
    { d: 15, pnl: 720 }, { d: 16, pnl: -450 }, { d: 17, pnl: 280 }, { d: 18, pnl:  190 }, { d: 19, pnl: -320 },
    { d: 20, weekend: true }, { d: 21, weekend: true },
  ],
  [
    { d: 22, pnl: 540 }, { d: 23, pnl:  380 }, { d: 24, pnl: -210 }, { d: 25, pnl: 820 }, { d: 26, pnl:  160 },
    { d: 27, weekend: true }, { d: 28, weekend: true },
  ],
  [
    { d: 29, pnl: null }, { d: 30, pnl: null }, { d: 31, pnl: null },
    { d: null }, { d: null },
    { d: null, weekend: true }, { d: null, weekend: true },
  ],
];

// mx/my: pixel offset applied at the extreme edges of the viewport (x=0 or x=1)
const ORB_CONFIGS = [
  { top: "10%", left: "8%",  size: "clamp(220px,32vw,520px)", color: "hsl(195,100%,50%)", opacity: 0.22, anim: "sb-orb-1", dur: "13s", mx:  70, my:  55 },
  { top: "4%",  left: "60%", size: "clamp(180px,25vw,380px)", color: "hsl(210,100%,45%)", opacity: 0.16, anim: "sb-orb-2", dur: "10s", mx: -55, my:  45 },
  { top: "55%", left: "3%",  size: "clamp(160px,22vw,340px)", color: "hsl(180,80%,42%)",  opacity: 0.18, anim: "sb-orb-3", dur: "15s", mx:  60, my: -38 },
  { top: "48%", left: "68%", size: "clamp(200px,28vw,430px)", color: "hsl(220,90%,48%)",  opacity: 0.14, anim: "sb-orb-2", dur: "11s", mx: -45, my:  62 },
] as const;

// ── CSS keyframes (drift is the base; mouse offset compounds on top) ───────────

const ORB_STYLES = `
@keyframes sb-orb-1 {
  0%,100% { transform: translate(0,0); }
  33%     { transform: translate(40px,-30px); }
  66%     { transform: translate(-22px,38px); }
}
@keyframes sb-orb-2 {
  0%,100% { transform: translate(0,0); }
  33%     { transform: translate(-30px,22px); }
  66%     { transform: translate(28px,-36px); }
}
@keyframes sb-orb-3 {
  0%,100% { transform: translate(0,0); }
  50%     { transform: translate(22px,-28px); }
}
`;

// ── useInView ──────────────────────────────────────────────────────────────────

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ── AnimatedSection ────────────────────────────────────────────────────────────

function AnimatedSection({ children, className = "", delay = 0 }: {
  children: React.ReactNode; className?: string; delay?: number;
}) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ── FeaturePill ────────────────────────────────────────────────────────────────

function FeaturePill({ label }: { label: string }) {
  return (
    <span className="text-xs px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary font-medium whitespace-nowrap">
      {label}
    </span>
  );
}

// ── BiasGauge ─────────────────────────────────────────────────────────────────

function BiasGauge() {
  const { ref, inView } = useInView(0.4);
  const rotation = inView ? 62 : -90;
  return (
    <div ref={ref} className="w-full max-w-xs mx-auto select-none">
      <svg viewBox="0 0 200 120" width="100%">
        <path d="M 25,100 A 75,75 0 0 1 175,100" stroke="hsl(215,25%,15%)" strokeWidth="14" fill="none" strokeLinecap="round" />
        <path d="M 25,100 A 75,75 0 0 1 62.5,35.05" stroke="hsl(0,60%,42%)" strokeWidth="14" fill="none" strokeLinecap="butt" />
        <path d="M 62.5,35.05 A 75,75 0 0 1 137.5,35.05" stroke="hsl(40,65%,42%)" strokeWidth="14" fill="none" strokeLinecap="butt" />
        <path d="M 137.5,35.05 A 75,75 0 0 1 175,100" stroke="hsl(195,100%,38%)" strokeWidth="14" fill="none" strokeLinecap="butt" />
        <g style={{
          transformOrigin: "100px 100px",
          transform: `rotate(${rotation}deg)`,
          transition: inView ? "transform 1.6s cubic-bezier(0.34,1.3,0.64,1)" : "none",
        }}>
          <line x1="100" y1="100" x2="100" y2="36" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        </g>
        <circle cx="100" cy="100" r="7" fill="hsl(215,25%,13%)" stroke="hsl(215,25%,25%)" strokeWidth="2" />
        <circle cx="100" cy="100" r="3.5" fill="hsl(195,100%,50%)" />
        <text x="18"  y="114" fill="hsl(0,60%,62%)"   fontSize="8.5" textAnchor="middle" fontFamily="sans-serif">Bearish</text>
        <text x="100" y="19"  fill="hsl(40,65%,62%)"  fontSize="8.5" textAnchor="middle" fontFamily="sans-serif">Neutral</text>
        <text x="182" y="114" fill="hsl(195,100%,50%)" fontSize="8.5" textAnchor="middle" fontFamily="sans-serif">Bullish</text>
      </svg>
      <div className="text-center -mt-1">
        <p className="text-2xl font-bold text-primary">Bullish Active</p>
        <p className="text-sm text-muted-foreground mt-1">EURUSD · H1 · H4 · D1</p>
        <div className="flex justify-center gap-2 mt-3 flex-wrap">
          {["M15", "H1", "H4", "D1"].map((tf, i) => (
            <span key={tf} className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${i < 3 ? "bg-primary/20 text-primary" : "bg-muted/50 text-muted-foreground"}`}>
              {tf}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── JournalShowcaseMockup ──────────────────────────────────────────────────────

function JournalShowcaseMockup() {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className="w-full max-w-lg mx-auto rounded-xl overflow-hidden border border-border shadow-2xl"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(20px)",
        transition: "opacity 0.7s ease, transform 0.7s ease",
      }}
    >
      {/* Browser chrome */}
      <div className="bg-card/80 border-b border-border px-4 py-2.5 flex items-center gap-3">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(0,65%,55%)" }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(40,70%,55%)" }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(142,55%,50%)" }} />
        </div>
        <div className="flex-1 bg-muted/40 rounded h-5 flex items-center px-3">
          <span className="text-[10px] text-muted-foreground">app.streambias.com/journal</span>
        </div>
      </div>

      <div className="bg-card p-4 space-y-3">
        {/* Panel A: Journal Calendar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-foreground">May 2026</p>
            <span className="text-[10px] text-muted-foreground">Trading Journal</span>
          </div>
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="text-[9px] text-center text-muted-foreground font-medium py-0.5">{d}</div>
            ))}
          </div>
          <div className="space-y-0.5">
            {CALENDAR_WEEKS.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 gap-0.5">
                {week.map((cell, ci) => {
                  if (cell.weekend) {
                    return <div key={ci} className="rounded bg-muted/20 min-h-[28px]" />;
                  }
                  if (cell.d === null) {
                    return <div key={ci} className="min-h-[28px]" />;
                  }
                  if (cell.pnl == null) {
                    return (
                      <div key={ci} className="rounded bg-muted/10 border border-border/20 min-h-[28px] flex items-center justify-center">
                        <span className="text-[8px] text-muted-foreground/40">{cell.d}</span>
                      </div>
                    );
                  }
                  const pos = cell.pnl > 0;
                  return (
                    <div
                      key={ci}
                      className={`rounded min-h-[28px] flex flex-col items-center justify-center ${
                        pos ? "bg-success/10 border border-success/20" : "bg-destructive/10 border border-destructive/20"
                      }`}
                    >
                      <span className="text-[7px] text-muted-foreground leading-none">{cell.d}</span>
                      <span className={`text-[7px] font-semibold leading-tight ${pos ? "text-success" : "text-destructive"}`}>
                        {pos ? "+" : ""}£{Math.abs(cell.pnl)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-border/50" />

        {/* Panel B: Equity curve */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-20">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={EQUITY_DATA} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
                <defs>
                  <linearGradient id="journal-eq-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="hsl(195,100%,50%)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="hsl(195,100%,50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke="hsl(195,100%,50%)" fill="url(#journal-eq-grad)" strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <div>
              <p className="text-[10px] text-muted-foreground">Total P&L</p>
              <p className="text-sm font-bold text-success">+£91,310</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Win rate</p>
              <p className="text-sm font-bold text-foreground">60%</p>
            </div>
          </div>
        </div>

        <div className="border-t border-border/50" />

        {/* Panel C: 30-Day Rolling Performance */}
        <div>
          <p className="text-[10px] text-muted-foreground mb-1.5">30-Day Rolling Performance</p>
          <div className="h-[70px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ROLLING_DATA} margin={{ top: 2, right: 0, left: 0, bottom: 2 }} barSize={16}>
                <YAxis hide domain={["auto", "auto"]} />
                <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>
                  {ROLLING_DATA.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.pnl >= 0 ? "hsl(142,55%,50%)" : "hsl(0,65%,55%)"}
                      fillOpacity={0.85}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── QuickRiskMockup ────────────────────────────────────────────────────────────

function QuickRiskMockup() {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className="w-full max-w-sm mx-auto"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(20px)",
        transition: "opacity 0.7s ease, transform 0.7s ease",
      }}
    >
      <div className="bg-card border border-border rounded-xl p-5 shadow-2xl space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Quick Risk Calculator</p>
          <span className="flex items-center gap-1.5 text-[10px] px-2.5 py-0.5 rounded-full bg-success/10 text-success border border-success/20 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            Linked
          </span>
        </div>

        <p className="text-[10px] text-muted-foreground">Mode: Linked — IG Demo Account</p>

        {/* Account Balance */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
          <div>
            <p className="text-[11px] text-muted-foreground">Account Balance</p>
            <p className="text-sm font-medium text-foreground">£140,000</p>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold">
            Auto
          </span>
        </div>

        {/* Risk % selector */}
        <div>
          <p className="text-[11px] text-muted-foreground mb-2">Risk per trade</p>
          <div className="flex gap-1.5">
            {["0.5%", "1%", "1.5%", "2%"].map((r) => (
              <button
                key={r}
                type="button"
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  r === "1%"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground border border-border"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Max Risk result */}
        <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
          <p className="text-xs text-primary font-medium mb-1">Max Risk</p>
          <p className="text-3xl font-bold text-primary">£1,400</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">at 1.0% of £140,000</p>
        </div>

        {/* Spread adjusted */}
        <div className="flex items-center justify-between px-0.5">
          <p className="text-xs text-muted-foreground">
            Spread adjusted: <span className="text-foreground font-medium">£1,387</span>
          </p>
          <div className="w-4 h-4 rounded-full bg-muted/60 flex items-center justify-center cursor-help">
            <span className="text-[9px] text-muted-foreground font-bold">?</span>
          </div>
        </div>

        <div className="border-t border-border/50" />

        {/* Live price */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground mb-0.5">Entry Price</p>
            <p className="text-sm font-medium text-foreground font-mono">1.08442</p>
          </div>
          <span className="flex items-center gap-1.5 text-[10px] text-success font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            Live
          </span>
        </div>
      </div>
    </div>
  );
}

// ── CalendarEventMockup ───────────────────────────────────────────────────────

const CAL_BARS = [
  { rate: "5.25%", h: 40 },
  { rate: "5.00%", h: 25 },
  { rate: "5.00%", h: 25 },
  { rate: "5.25%", h: 40 },
  { rate: "5.00%", h: 25 },
  { rate: "4.75%", h: 10 },
];

function CalendarEventMockup() {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className="w-full max-w-lg mx-auto rounded-xl overflow-hidden border border-border shadow-2xl"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(20px)",
        transition: "opacity 0.7s ease, transform 0.7s ease",
      }}
    >
      {/* Browser chrome */}
      <div className="bg-card/80 border-b border-border px-4 py-2.5 flex items-center gap-3">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(0,65%,55%)" }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(40,70%,55%)" }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(142,55%,50%)" }} />
        </div>
        <div className="flex-1 bg-muted/40 rounded h-5 flex items-center px-3">
          <span className="text-[10px] text-muted-foreground">app.streambias.com/calendar</span>
        </div>
      </div>

      {/* Event detail panel */}
      <div className="bg-card p-5 space-y-4">
        {/* Event header */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/15 text-destructive border border-destructive/25 font-bold uppercase tracking-wide">
              HIGH
            </span>
            <p className="text-sm font-semibold text-foreground">BOE Interest Rate Decision</p>
          </div>
          <p className="text-[11px] text-muted-foreground">GBP · Today · 12:00 UTC</p>
        </div>

        {/* Stat boxes */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Previous", value: "5.00%", green: false },
            { label: "Forecast", value: "4.75%", green: false },
            { label: "Actual",   value: "4.75%", green: true  },
          ].map(({ label, value, green }) => (
            <div
              key={label}
              className={`rounded-lg p-3 flex flex-col gap-1 ${
                green
                  ? "bg-success/10 border border-success/20"
                  : "bg-muted/40 border border-border"
              }`}
            >
              <p className="text-[9px] text-muted-foreground uppercase tracking-wide font-medium">{label}</p>
              <p className={`text-base font-bold ${green ? "text-success" : "text-foreground"}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Historical trend */}
        <div>
          <p className="text-[10px] text-muted-foreground mb-2">Historical Trend</p>
          <div className="flex items-end gap-1.5 h-12">
            {CAL_BARS.map((bar, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm"
                style={{
                  height: `${bar.h}px`,
                  background: i === CAL_BARS.length - 1
                    ? "hsl(var(--primary))"
                    : "hsl(var(--muted-foreground)/0.3)",
                }}
              />
            ))}
          </div>
          <div className="flex gap-1.5 mt-1">
            {CAL_BARS.map((bar, i) => (
              <p key={i} className="flex-1 text-center text-[7px] text-muted-foreground">{bar.rate}</p>
            ))}
          </div>
        </div>

        {/* Outcome note */}
        <p className="text-xs text-success font-medium">Rate cut confirmed — matched forecast</p>

        {/* Action buttons */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            className="flex-1 text-[11px] font-medium py-2 px-3 rounded-lg border border-border bg-muted/30 text-foreground hover:bg-muted/60 transition-colors"
          >
            🔔 Set Price Alert
          </button>
          <button
            type="button"
            className="flex-1 text-[11px] font-medium py-2 px-3 rounded-lg border border-border bg-muted/30 text-foreground hover:bg-muted/60 transition-colors"
          >
            📅 Add to Calendar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── GuideCard ─────────────────────────────────────────────────────────────────

function GuideCard({ title, level, readTime }: { title: string; level: string; readTime: string }) {
  const levelColor = level === "Beginner"
    ? "bg-success/10 text-success border-success/20"
    : "bg-primary/10 text-primary border-primary/20";
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3 hover:border-primary/40 transition-colors h-full">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-foreground leading-snug">{title}</p>
        <span className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 font-medium ${levelColor}`}>{level}</span>
      </div>
      <p className="text-xs text-muted-foreground">{readTime} read</p>
      <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary/40 rounded-full" style={{ width: "0%" }} />
      </div>
    </div>
  );
}

// ── NavBar ────────────────────────────────────────────────────────────────────

function NavBar({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [visible, setVisible] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setVisible(y < lastY.current || y < 80);
      setScrolled(y > 20);
      lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 h-16"
      style={{
        backdropFilter: "blur(12px)",
        background: scrolled ? "hsl(var(--background)/0.85)" : "transparent",
        borderBottom: scrolled ? "1px solid hsl(var(--border)/0.5)" : "1px solid transparent",
        transform: visible ? "translateY(0)" : "translateY(-100%)",
        transition: "transform 0.3s ease, background 0.3s ease, border-color 0.3s ease",
      }}
    >
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
      >
        <img src={sbLogo} alt="StreamBias" className="h-8 w-auto" />
        <span className="text-lg font-bold text-foreground">StreamBias</span>
      </button>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => onNavigate("/login")}>Sign in</Button>
        <Button size="sm" onClick={() => onNavigate("/register")}>Start Free Trial</Button>
      </div>
    </nav>
  );
}

// ── Landing ───────────────────────────────────────────────────────────────────

export default function Landing() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const { isActive, isLoading: subLoading } = useSubscription();

  useEffect(() => {
    if (!isLoading && !subLoading && user && isActive) navigate("/dashboard", { replace: true });
  }, [user, isLoading, isActive, subLoading, navigate]);

  // Orb mouse tracking — window mousemove, direct DOM updates, zero re-renders
  const orbInnerRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;
      ORB_CONFIGS.forEach((cfg, i) => {
        const el = orbInnerRefs.current[i];
        if (el) el.style.transform = `translate(${x * cfg.mx}px, ${y * cfg.my}px)`;
      });
    };
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, []);

  const [demoName, setDemoName] = useState("");
  const [demoEmail, setDemoEmail] = useState("");
  const [demoSubmitting, setDemoSubmitting] = useState(false);
  const [demoSubmitted, setDemoSubmitted] = useState(false);
  const [demoError, setDemoError] = useState("");

  async function handleDemoSubmit(e: React.FormEvent) {
    e.preventDefault();
    setDemoSubmitting(true);
    setDemoError("");
    const result = await submitDemoLead(demoName, demoEmail);
    setDemoSubmitting(false);
    if (result.success) {
      setDemoSubmitted(true);
    } else {
      setDemoError(result.error ?? "Something went wrong. Please try again.");
    }
  }

  const scrollToFeatures = () =>
    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });

  return (
    <>
      <style>{ORB_STYLES}</style>

      <NavBar onNavigate={navigate} />

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-background px-6 text-center">
        {/* Orbs — outer div carries CSS drift, inner div carries mouse offset */}
        {ORB_CONFIGS.map((cfg, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              top: cfg.top,
              left: cfg.left,
              animation: `${cfg.anim} ${cfg.dur} ease-in-out infinite`,
              pointerEvents: "none",
            }}
          >
            <div
              ref={(el) => { orbInnerRefs.current[i] = el; }}
              style={{
                width: cfg.size,
                height: cfg.size,
                borderRadius: "50%",
                background: cfg.color,
                opacity: cfg.opacity,
                filter: "blur(80px)",
                transition: "transform 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
              }}
            />
          </div>
        ))}

        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center gap-6">
          <div className="flex items-center gap-3 mb-2">
            <img src={sbLogo} alt="StreamBias" className="h-12 w-auto" />
            <span className="text-2xl font-bold text-foreground">StreamBias</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-foreground leading-tight tracking-tight">
            Clear bias.<br />
            <span className="text-primary">Clear mind.</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
            Live market bias, real-time news, and deep journal analytics — all in one place,
            so you can execute every trade with a clear mind and full confidence.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
            <Button size="lg" className="h-12 px-8 text-base font-semibold" onClick={() => navigate("/register")}>
              Start Free Trial
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 text-base" onClick={scrollToFeatures}>
              See it in action
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mt-2">7-day free trial · Cancel before day 7 and you won't be charged.</p>
        </div>

        <button
          type="button"
          onClick={scrollToFeatures}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-muted-foreground hover:text-foreground transition-colors animate-bounce"
          aria-label="Scroll down"
        >
          <ChevronDown className="h-6 w-6" />
        </button>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-background">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection className="text-center mb-14 flex flex-col items-center gap-2">
            <span className="text-xs font-bold tracking-widest uppercase text-primary">How it works</span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">Up and running in minutes.</h2>
          </AnimatedSection>

          <div className="relative grid md:grid-cols-3 gap-10">
            {/* Dashed connector — desktop only */}
            <div
              className="hidden md:block absolute top-10 left-[calc(16.67%+1.5rem)] right-[calc(16.67%+1.5rem)] h-px"
              style={{ borderTop: "2px dashed hsl(var(--border))" }}
            />

            {[
              {
                Icon: UserPlus,
                step: "1",
                title: "Create your account",
                desc: "Start your 7-day free trial — card required to begin. Cancel any time before day 7 and you won't be charged a thing.",
              },
              {
                Icon: BarChart2,
                step: "2",
                title: "Connect your markets",
                desc: "Select the assets you trade. StreamBias starts reading bias and delivering signals immediately.",
              },
              {
                Icon: TrendingUp,
                step: "3",
                title: "Trade with clarity",
                desc: "Open every session knowing the bias, logging every trade, and improving with data-backed insights.",
              },
            ].map(({ Icon, step, title, desc }, i) => (
              <AnimatedSection key={step} delay={i * 120} className="flex flex-col items-center text-center gap-4">
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                  <span className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-md">
                    {step}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">{desc}</p>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF / BUILT FOR EVERY MARKET ─────────────────────────── */}
      <section className="py-12 px-6 bg-background">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-6">
          <AnimatedSection>
            <p className="text-sm font-semibold text-muted-foreground text-center">Built for every market</p>
          </AnimatedSection>
          <AnimatedSection delay={100} className="flex items-center gap-3 flex-wrap justify-center">
            {[
              { label: "FX",      Icon: TrendingUp },
              { label: "Gold",    Icon: Gem        },
              { label: "Indices", Icon: BarChart2  },
              { label: "Crypto",  Icon: Bitcoin    },
              { label: "Stocks",  Icon: LineChart  },
            ].map(({ label, Icon }) => (
              <span key={label} className="flex items-center gap-2 px-6 py-3 rounded-full bg-muted/60 border border-border text-sm font-semibold text-foreground/80">
                <Icon className="h-4 w-4 text-primary" />
                {label}
              </span>
            ))}
          </AnimatedSection>
        </div>
      </section>

      {/* ── FEATURE 1: BIAS ENGINE ────────────────────────────────────────── */}
      <section id="features" className="py-20 px-6 bg-background">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <AnimatedSection className="flex flex-col gap-5">
            <span className="text-xs font-bold tracking-widest uppercase text-primary">Bias Engine</span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
              Know exactly where the market stands.
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              StreamBias reads candle structure across every timeframe and delivers a single verdict —
              Bullish Active, Bearish Weakening, Neutral — updated in real time. No more conflicting signals.
            </p>
            <div className="flex flex-wrap gap-2 mt-1">
              <FeaturePill label="Multi-timeframe analysis" />
              <FeaturePill label="Candle-close aware" />
              <FeaturePill label="Confidence scoring" />
            </div>
          </AnimatedSection>

          <AnimatedSection delay={150} className="flex justify-center">
            <div className="w-full max-w-xs bg-card border border-border rounded-2xl p-8 shadow-xl">
              <BiasGauge />
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── DEMO VIDEO ────────────────────────────────────────────────────── */}
      <section className="py-20 px-6" style={{ background: "hsl(var(--card)/0.4)" }}>
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-10">
          <AnimatedSection className="text-center flex flex-col items-center gap-3">
            <span className="text-xs font-bold tracking-widest uppercase text-primary">See it live</span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">Watch StreamBias in action.</h2>
            <p className="text-muted-foreground max-w-xl leading-relaxed">Get a quick feel for the platform.</p>
          </AnimatedSection>

          {/* Part A: 60-second overview */}
          <AnimatedSection delay={100} className="w-full">
            <div
              className="relative w-full rounded-2xl overflow-hidden border border-border shadow-2xl"
              style={{ aspectRatio: "16/9", background: "hsl(var(--card))" }}
            >
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: "linear-gradient(hsl(var(--border)/0.5) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)/0.5) 1px, transparent 1px)",
                  backgroundSize: "40px 40px",
                }}
              />
              <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-primary/90 text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full backdrop-blur-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground animate-pulse" />
                Preview
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-primary/90 backdrop-blur-sm flex items-center justify-center shadow-lg hover:bg-primary transition-colors cursor-pointer border border-primary-foreground/20">
                  <Play className="h-8 w-8 text-primary-foreground fill-primary-foreground ml-1" />
                </div>
              </div>
              <div className="absolute bottom-4 right-4 bg-background/80 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5">
                <p className="text-xs text-muted-foreground">60-second overview · Coming soon</p>
              </div>
            </div>
          </AnimatedSection>

          {/* Divider */}
          <div className="w-full flex items-center gap-4">
            <div className="flex-1 border-t border-border" />
            <p className="text-xs text-muted-foreground shrink-0">or</p>
            <div className="flex-1 border-t border-border" />
          </div>

          {/* Part B: Email gate — full platform walkthrough */}
          <AnimatedSection delay={150} className="w-full max-w-md mx-auto">
            {demoSubmitted ? (
              <div className="text-center p-8 rounded-2xl border border-primary/20 bg-primary/5 flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Play className="h-5 w-5 text-primary fill-primary" />
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  You're on the list — we'll send the full walkthrough straight to your inbox.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 text-center">
                <h3 className="text-lg font-semibold text-foreground">Want the full platform walkthrough?</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Get notified when the demo goes live.
                </p>
                <form onSubmit={handleDemoSubmit} className="flex flex-col gap-3 w-full">
                  <input
                    type="text"
                    placeholder="Your name"
                    required
                    value={demoName}
                    onChange={(e) => setDemoName(e.target.value)}
                    className="w-full h-10 px-4 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <input
                    type="email"
                    placeholder="Your email address"
                    required
                    value={demoEmail}
                    onChange={(e) => setDemoEmail(e.target.value)}
                    className="w-full h-10 px-4 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  {demoError && <p className="text-xs text-destructive text-center">{demoError}</p>}
                  <Button type="submit" className="h-11 font-semibold" disabled={demoSubmitting}>
                    {demoSubmitting ? "Sending…" : "Notify Me →"}
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">No spam. Unsubscribe anytime.</p>
                </form>
              </div>
            )}
          </AnimatedSection>
        </div>
      </section>

      {/* ── FEATURE 2: JOURNAL ────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-background">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <AnimatedSection delay={100}>
            <JournalShowcaseMockup />
          </AnimatedSection>

          <AnimatedSection delay={200} className="flex flex-col gap-5">
            <span className="text-xs font-bold tracking-widest uppercase text-primary">Trading Journal</span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
              A journal that analyses itself.
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Log trades manually or sync your broker. StreamBias calculates win rate, R:R, session performance
              and emotional patterns — surfacing insights you'd never find manually.
            </p>
            <div className="flex flex-wrap gap-2 mt-1">
              <FeaturePill label="Auto P&L calculation" />
              <FeaturePill label="Session analysis" />
              <FeaturePill label="Psychology reports" />
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── FEATURE 3: RISK TOOLS ─────────────────────────────────────────── */}
      <section className="py-20 px-6" style={{ background: "hsl(var(--card)/0.4)" }}>
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <AnimatedSection className="flex flex-col gap-5">
            <span className="text-xs font-bold tracking-widest uppercase text-primary">Risk Management</span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
              Risk management that knows your account.
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Position sizing, daily risk limits, and drawdown protection — all connected to your live balance.
              Set your rules once and trade within them every session.
            </p>
            <div className="flex flex-wrap gap-2 mt-1">
              <FeaturePill label="Live balance sync" />
              <FeaturePill label="Position calculator" />
              <FeaturePill label="Drawdown guard" />
            </div>
          </AnimatedSection>

          <AnimatedSection delay={150}>
            <QuickRiskMockup />
          </AnimatedSection>
        </div>
      </section>

      {/* ── FEATURE 4: CALENDAR + ALERTS ─────────────────────────────────── */}
      <section className="py-20 px-6" style={{ background: "hsl(var(--card)/0.4)" }}>
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <AnimatedSection delay={150}>
            <CalendarEventMockup />
          </AnimatedSection>

          <AnimatedSection className="flex flex-col gap-5">
            <span className="text-xs font-bold tracking-widest uppercase text-primary">Economic Calendar</span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
              Always know what's moving the market.
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              A live economic calendar automatically filters high-impact events to the exact pairs you trade —
              so you're never caught off guard by a rate decision, inflation print, or jobs report.
            </p>
            <div className="flex flex-wrap gap-2 mt-1">
              <FeaturePill label="Filtered by your pairs" />
              <FeaturePill label="Previous, forecast & actual" />
              <FeaturePill label="High-impact flagged" />
            </div>

            <div className="border-t border-border/50 pt-5 flex flex-col gap-3">
              <span className="text-xs font-bold tracking-widest text-primary/70">PLUS — CUSTOM ALERTS</span>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Set custom price alerts and news notifications. StreamBias monitors the market for you so you
                can step away from the charts without missing a move.
              </p>
              <div className="flex flex-wrap gap-2">
                {["Price level alerts", "Session open alerts", "News event notifications"].map((label) => (
                  <span
                    key={label}
                    className="text-[10px] px-2.5 py-0.5 rounded-full border border-border/50 bg-muted/30 text-muted-foreground font-medium whitespace-nowrap"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── TESTIMONIALS ──────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-background">
        <div className="max-w-6xl mx-auto">
          <AnimatedSection className="text-center mb-10 flex flex-col items-center gap-2">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">What traders are saying.</h2>
            <p className="text-muted-foreground">Real feedback from our beta traders.</p>
          </AnimatedSection>

          <div className="grid sm:grid-cols-3 gap-5">
            {[
              {
                initials: "JM", name: "James M.", role: "FX Day Trader",
                quote: "StreamBias completely changed how I approach my morning prep. The bias engine tells me exactly what I need to know before the London open.",
              },
              {
                initials: "SR", name: "Sarah R.", role: "Swing Trader",
                quote: "The journal reports showed me I was consistently losing on Fridays. I had no idea. That insight alone paid for the subscription.",
              },
              {
                initials: "TK", name: "Tom K.", role: "Prop Trader",
                quote: "Having bias, news, and my journal all in one place means I spend less time switching between tools and more time actually trading.",
              },
            ].map((t, i) => (
              <AnimatedSection key={t.name} delay={i * 100}>
                <div className="bg-card border border-border rounded-xl p-6 flex flex-col gap-4 h-full">
                  <div className="flex gap-0.5 text-yellow-400 text-base">
                    {"★★★★★".split("").map((star, j) => <span key={j}>{star}</span>)}
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed flex-1">"{t.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                      {t.initials}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── EDUCATION ─────────────────────────────────────────────────────── */}
      <section className="py-20 px-6" style={{ background: "hsl(var(--muted)/0.2)" }}>
        <div className="max-w-4xl mx-auto">
          <AnimatedSection className="text-center mb-10 flex flex-col items-center gap-4">
            <span className="text-xs font-bold tracking-widest uppercase text-primary">Education</span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">Learn while you trade.</h2>
            <p className="text-muted-foreground max-w-xl leading-relaxed">
              Quick guides on market structure, risk, psychology, and sessions — searchable and always
              relevant to what you're working on.
            </p>
          </AnimatedSection>

          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { title: "Understanding Market Structure",   level: "Beginner",     readTime: "4 min" },
              { title: "The Psychology of Trading Losses", level: "Intermediate", readTime: "6 min" },
              { title: "Risk Management: The 1% Rule",     level: "Beginner",     readTime: "3 min" },
            ].map((guide, i) => (
              <AnimatedSection key={guide.title} delay={i * 100}>
                <GuideCard {...guide} />
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOUNDING MEMBER ───────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-background">
        <div className="max-w-2xl mx-auto">
          <AnimatedSection>
            <div
              className="border border-primary/20 rounded-2xl p-8 md:p-12 text-center flex flex-col items-center gap-5"
              style={{
                background: "radial-gradient(ellipse at top, hsl(195 100% 50% / 0.07) 0%, transparent 70%)",
                boxShadow: "0 0 60px hsl(195 100% 50% / 0.06)",
              }}
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-bold tracking-widest uppercase text-primary">Limited Offer</span>
              </div>

              <h2 className="text-3xl md:text-4xl font-bold text-foreground">Become a Founding Member.</h2>

              <p className="text-muted-foreground max-w-md leading-relaxed">
                Lock in 50% off Pro — forever. Start with a 7-day free trial, then pay half price for life.
                Only available to the first 100 members. Start your 7-day free trial — cancel before day 7 and you won't be charged.
              </p>

              {/* ── UPDATE BEFORE LAUNCH: adjust spot count, percentage, and progress bar width ── */}
              <div className="w-full max-w-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">67 of 100 spots remaining</span>
                  <span className="text-xs text-primary font-semibold">33% claimed</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: "33%" }} />
                </div>
              </div>

              <Button
                size="lg"
                className="h-12 px-10 text-base font-semibold mt-1"
                onClick={() => navigate("/register")}
              >
                Claim Your Spot
              </Button>

              <p className="text-xs text-muted-foreground">Card required to start trial. Cancel before day 7 — you won't be charged a thing.</p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────────────────── */}
      <section className="relative py-20 px-6 overflow-hidden bg-background flex flex-col items-center justify-center text-center">
        <div
          style={{
            position: "absolute", top: "15%", left: "15%",
            width: "clamp(160px,24vw,320px)", height: "clamp(160px,24vw,320px)",
            borderRadius: "50%", background: "hsl(195,100%,50%)",
            opacity: 0.10, filter: "blur(70px)", pointerEvents: "none",
            animation: "sb-orb-1 14s ease-in-out infinite",
          }}
        />
        <div
          style={{
            position: "absolute", top: "25%", right: "12%",
            width: "clamp(130px,18vw,260px)", height: "clamp(130px,18vw,260px)",
            borderRadius: "50%", background: "hsl(220,90%,48%)",
            opacity: 0.09, filter: "blur(70px)", pointerEvents: "none",
            animation: "sb-orb-2 11s ease-in-out infinite",
          }}
        />

        <AnimatedSection className="relative z-10 flex flex-col items-center gap-5 max-w-xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground leading-tight">
            Ready to trade with conviction?
          </h2>
          <p className="text-lg text-muted-foreground">Start your 7-day free trial. Cancel before day 7 and you won't be charged.</p>
          <Button
            size="lg"
            className="h-14 px-10 text-lg font-semibold mt-2"
            onClick={() => navigate("/register")}
          >
            Start Free Trial
          </Button>
          <p className="text-xs text-muted-foreground">
            Already have an account?{" "}
            <button type="button" onClick={() => navigate("/login")} className="text-primary hover:underline">
              Sign in
            </button>
          </p>
        </AnimatedSection>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-card/30 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <img src={sbLogo} alt="StreamBias" className="h-6 w-auto opacity-70" />
            <span className="text-sm text-muted-foreground font-medium">StreamBias</span>
          </div>

          <div className="flex items-center gap-6">
            <button type="button" onClick={() => navigate("/login")}    className="text-xs text-muted-foreground hover:text-foreground transition-colors">Sign in</button>
            <button type="button" onClick={() => navigate("/register")} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Create Account</button>
            <button type="button" onClick={() => navigate("/privacy")}  className="text-xs text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</button>
            <button type="button" onClick={() => navigate("/terms")}    className="text-xs text-muted-foreground hover:text-foreground transition-colors">Terms</button>
            <button type="button" onClick={resetConsentStatus}          className="text-xs text-muted-foreground hover:text-foreground transition-colors">Cookie Settings</button>
          </div>

          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} StreamBias. Built for disciplined traders.
          </p>
        </div>
      </footer>
    </>
  );
}
