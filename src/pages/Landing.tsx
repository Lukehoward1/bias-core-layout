import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AreaChart, Area, ResponsiveContainer, XAxis } from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import sbLogo from "@/assets/sb-logo.svg";
import { ChevronDown, Play, UserPlus, BarChart2, TrendingUp } from "lucide-react";
import { submitDemoLead } from "@/lib/demoLeads";

// ── Static data ────────────────────────────────────────────────────────────────

const EQUITY_DATA = [
  { d: "Jan", v: 10000 }, { d: "Feb", v: 10420 }, { d: "Mar", v: 10210 },
  { d: "Apr", v: 10890 }, { d: "May", v: 11340 }, { d: "Jun", v: 11180 },
  { d: "Jul", v: 11820 }, { d: "Aug", v: 12350 }, { d: "Sep", v: 12100 },
  { d: "Oct", v: 13050 }, { d: "Nov", v: 13480 }, { d: "Dec", v: 14200 },
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

// ── EquityMockup ───────────────────────────────────────────────────────────────

function EquityMockup() {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className="w-full rounded-xl overflow-hidden border border-border shadow-2xl"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(20px)",
        transition: "opacity 0.7s ease, transform 0.7s ease",
      }}
    >
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
      <div className="bg-card p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Equity Curve</p>
            <p className="text-2xl font-bold text-success">+£4,200</p>
            <p className="text-xs text-muted-foreground mt-0.5">Dec 2025 – Dec 2026</p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-success/10 text-success font-semibold border border-success/20">+42.0%</span>
        </div>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={EQUITY_DATA} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="landing-eq-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="hsl(195,100%,50%)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="hsl(195,100%,50%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="d" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <Area type="monotone" dataKey="v" stroke="hsl(195,100%,50%)" fill="url(#landing-eq-grad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4">
          {[{ label: "Win Rate", value: "68%" }, { label: "Avg R:R", value: "1.8" }, { label: "Trades", value: "94" }].map(({ label, value }) => (
            <div key={label} className="text-center p-2 rounded-lg bg-muted/40">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-sm font-bold text-foreground">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── RiskCalculatorMockup ───────────────────────────────────────────────────────

function RiskCalculatorMockup() {
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
        <div className="flex items-center gap-2 pb-1">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <p className="text-sm font-semibold text-foreground">Position Size Calculator</p>
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20">Linked</span>
        </div>
        {[
          { label: "Account Balance", value: "£10,000", note: "IG Demo Account" },
          { label: "Risk per trade",  value: "1.0%",    note: "£100 max loss" },
          { label: "Stop loss",       value: "25 pips", note: "EURUSD" },
        ].map(({ label, value, note }) => (
          <div key={label} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
            <div>
              <p className="text-[11px] text-muted-foreground">{label}</p>
              <p className="text-sm font-medium text-foreground">{value}</p>
            </div>
            <p className="text-[11px] text-muted-foreground">{note}</p>
          </div>
        ))}
        <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
          <p className="text-xs text-primary font-medium mb-1.5">Recommended Position Size</p>
          <p className="text-3xl font-bold text-primary">0.40 <span className="text-base font-normal text-primary/70">lots</span></p>
          <div className="flex gap-4 mt-2">
            <p className="text-xs text-muted-foreground">Max risk: <span className="text-foreground">£100</span></p>
            <p className="text-xs text-muted-foreground">Margin: <span className="text-foreground">~£400</span></p>
          </div>
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
        <Button size="sm" onClick={() => onNavigate("/register")}>Start Free</Button>
      </div>
    </nav>
  );
}

// ── Landing ───────────────────────────────────────────────────────────────────

export default function Landing() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) navigate("/dashboard", { replace: true });
  }, [user, isLoading, navigate]);

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
              Start Free
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 text-base" onClick={scrollToFeatures}>
              See it in action
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mt-2">No credit card required · Free to start</p>
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

      {/* ── SOCIAL PROOF ──────────────────────────────────────────────────── */}
      <AnimatedSection>
        <div className="border-y border-border bg-card/30 py-5 px-6">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground/70">Trusted by traders across</span>
            <div className="flex items-center gap-2 flex-wrap justify-center">
              {["FX", "Gold", "Indices", "Crypto", "Stocks"].map((asset) => (
                <span key={asset} className="px-3 py-1 rounded-full bg-muted/60 border border-border text-xs font-medium text-foreground/80">
                  {asset}
                </span>
              ))}
            </div>
          </div>
        </div>
      </AnimatedSection>

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
                icon: UserPlus,
                step: "1",
                title: "Create your account",
                desc: "Sign up free — no credit card needed. Your 7-day trial starts the moment you log in.",
              },
              {
                icon: BarChart2,
                step: "2",
                title: "Connect your markets",
                desc: "Select the assets you trade. StreamBias starts reading bias and delivering signals immediately.",
              },
              {
                icon: TrendingUp,
                step: "3",
                title: "Trade with clarity",
                desc: "Open every session knowing the bias, logging every trade, and improving with data-backed insights.",
              },
            ].map(({ icon: Icon, step, title, desc }, i) => (
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
            <p className="text-muted-foreground max-w-xl leading-relaxed">
              See how traders use StreamBias to build their morning bias, manage risk, and review their week — all in one platform.
            </p>
          </AnimatedSection>

          {/* Video placeholder */}
          <AnimatedSection delay={100} className="w-full">
            <div
              className="relative w-full rounded-2xl overflow-hidden border border-border shadow-2xl"
              style={{ aspectRatio: "16/9", background: "hsl(var(--card))" }}
            >
              {/* Grid pattern */}
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: "linear-gradient(hsl(var(--border)/0.5) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)/0.5) 1px, transparent 1px)",
                  backgroundSize: "40px 40px",
                }}
              />
              {/* Preview badge */}
              <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-primary/90 text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full backdrop-blur-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground animate-pulse" />
                Preview
              </div>
              {/* Play button */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-primary/90 backdrop-blur-sm flex items-center justify-center shadow-lg hover:bg-primary transition-colors cursor-pointer border border-primary-foreground/20">
                  <Play className="h-8 w-8 text-primary-foreground fill-primary-foreground ml-1" />
                </div>
              </div>
              {/* Mock UI preview label */}
              <div className="absolute bottom-4 right-4 bg-background/80 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5">
                <p className="text-xs text-muted-foreground">Full demo • 4 min</p>
              </div>
            </div>
          </AnimatedSection>

          {/* Email gate */}
          <AnimatedSection delay={200} className="w-full max-w-md mx-auto">
            {demoSubmitted ? (
              <div className="text-center p-8 rounded-2xl border border-primary/20 bg-primary/5 flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Play className="h-5 w-5 text-primary fill-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">You're in!</h3>
                <p className="text-sm text-muted-foreground">We'll send the full demo to your inbox shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleDemoSubmit} className="flex flex-col gap-3">
                <p className="text-center text-sm text-muted-foreground mb-1">
                  Enter your details to watch the full demo.
                </p>
                <input
                  type="text"
                  placeholder="Your name"
                  required
                  value={demoName}
                  onChange={e => setDemoName(e.target.value)}
                  className="w-full h-10 px-4 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <input
                  type="email"
                  placeholder="Your email address"
                  required
                  value={demoEmail}
                  onChange={e => setDemoEmail(e.target.value)}
                  className="w-full h-10 px-4 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                {demoError && <p className="text-xs text-destructive text-center">{demoError}</p>}
                <Button type="submit" className="h-11 font-semibold" disabled={demoSubmitting}>
                  {demoSubmitting ? "Sending…" : "Watch the Full Demo →"}
                </Button>
                <p className="text-center text-xs text-muted-foreground">No spam. Unsubscribe anytime.</p>
              </form>
            )}
          </AnimatedSection>
        </div>
      </section>

      {/* ── FEATURE 2: JOURNAL ────────────────────────────────────────────── */}
      <section className="py-20 px-6" style={{ background: "hsl(var(--card)/0.4)" }}>
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <AnimatedSection delay={100}>
            <EquityMockup />
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
      <section className="py-20 px-6 bg-background">
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
            <RiskCalculatorMockup />
          </AnimatedSection>
        </div>
      </section>

      {/* ── TESTIMONIALS ──────────────────────────────────────────────────── */}
      <section className="py-20 px-6" style={{ background: "hsl(var(--card)/0.4)" }}>
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

      {/* ── FEATURE 4: EDUCATION ──────────────────────────────────────────── */}
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
                Only available to the first 100 members.
              </p>

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

              <p className="text-xs text-muted-foreground">Cancel anytime. No credit card required to start.</p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────────────────── */}
      <section className="relative py-20 px-6 overflow-hidden bg-background flex flex-col items-center justify-center text-center">
        {/* Orbs */}
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
          <p className="text-lg text-muted-foreground">Start your 7-day free trial. No credit card required.</p>
          <Button
            size="lg"
            className="h-14 px-10 text-lg font-semibold mt-2"
            onClick={() => navigate("/register")}
          >
            Create Free Account
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
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src={sbLogo} alt="StreamBias" className="h-6 w-auto opacity-70" />
            <span className="text-sm text-muted-foreground font-medium">StreamBias</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} StreamBias. Built for disciplined traders.
          </p>
        </div>
      </footer>
    </>
  );
}
