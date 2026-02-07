import {
  LayoutDashboard,
  TrendingUp,
  Calendar,
  Bell,
  Calculator,
  BookOpen,
  Beaker,
  Users,
  GraduationCap,
  Video,
  Link2,
  Settings,
  CreditCard,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
  Zap,
  X,
  Star,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAppSidebar } from "@/hooks/use-app-sidebar";
import { useTheme } from "@/hooks/use-theme";
import { useIsMobile } from "@/hooks/use-mobile";
import sbLogo from "@/assets/sb-logo.svg";

type Item = { title: string; url: string; icon: any };

const mainItems: Item[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Markets", url: "/markets", icon: TrendingUp },
  { title: "Calendar", url: "/calendar", icon: Calendar },
  { title: "Alerts", url: "/alerts", icon: Bell },
  { title: "Risk Tools", url: "/risk-tools", icon: Calculator },
  { title: "Journal", url: "/journal", icon: BookOpen },
  { title: "Strategy Tester", url: "/strategy-tester", icon: Beaker },
  { title: "Community", url: "/community", icon: Users },
];

const learningItems: Item[] = [
  { title: "Education", url: "/education", icon: GraduationCap },
  { title: "Webinars", url: "/webinars", icon: Video },
];

const brokerageItems: Item[] = [{ title: "Brokerage", url: "/brokerage", icon: Link2 }];

const accountItems: Item[] = [
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Subscriptions", url: "/billing", icon: CreditCard },
];

export function AppSidebar() {
  const { collapsed, toggleCollapsed, mobileOpen, setMobileOpen } = useAppSidebar();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const currentPath = location.pathname;

  const go = (url: string) => {
    navigate(url);
    if (isMobile) setMobileOpen(false);
  };

  // Unified nav button styling (so Theme/Upgrade match the rest)
  const navBtnBase = `
    w-full text-left
    flex items-center rounded-lg transition-all relative
    px-3 py-2
    hover:bg-sidebar-accent/50
    text-sidebar-foreground
  `;

  const NavSection = ({ title, items }: { title: string; items: Item[] }) => (
    <div>
      {!collapsed && (
        <div className="px-3 mb-2">
          <h2 className="text-[11px] font-semibold text-muted-foreground tracking-wider uppercase">{title}</h2>
        </div>
      )}

      <div className="space-y-0.5">
        {items.map((item) => {
          const isActive = currentPath === item.url || (item.url !== "/" && currentPath.startsWith(item.url));
          const Icon = item.icon;

          return (
            <button
              key={item.url}
              type="button"
              onPointerDown={(e) => {
                // navigate on pointerdown to avoid environments where click gets suppressed
                e.preventDefault();
                e.stopPropagation();
                go(item.url);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  go(item.url);
                }
              }}
              className={[
                navBtnBase,
                collapsed && !isMobile ? "justify-center mx-1 px-0" : "justify-start",
                isActive ? "bg-sidebar-accent text-sidebar-primary" : "",
              ].join(" ")}
            >
              {isActive && !collapsed && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full" />
              )}
              <Icon className={`${collapsed && !isMobile ? "" : "mr-3"} h-[18px] w-[18px] flex-shrink-0`} />
              {(!collapsed || isMobile) && <span className="text-sm font-medium">{item.title}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );

  const sidebarContent = (
    <>
      {/* TOP: Logo (no border lines) */}
      <div className="flex-shrink-0">
        <div className={`h-14 ${collapsed && !isMobile ? "px-3" : "px-4"} flex items-center justify-between`}>
          <div className={`flex items-center ${collapsed && !isMobile ? "justify-center" : "gap-3"}`}>
            <img
              src={sbLogo}
              alt="StreamBias"
              // Fix: keep logo readable when collapsed
              className={`${collapsed && !isMobile ? "h-8" : "h-8"} w-auto flex-shrink-0`}
            />
            {(!collapsed || isMobile) && <span className="text-lg font-bold text-foreground">StreamBias</span>}
          </div>

          {isMobile && (
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Collapse Button - Desktop only (no border divider) */}
        {!isMobile && (
          <div className="px-3 py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleCollapsed}
              className={`w-full justify-center hover:bg-sidebar-accent h-8 ${collapsed ? "px-0" : ""}`}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>
        )}
      </div>

      {/* MIDDLE */}
      <div className="flex-1 flex flex-col overflow-y-auto px-3 py-2 space-y-5">
        <NavSection title="MAIN" items={mainItems} />
        <NavSection title="LEARNING" items={learningItems} />
        <NavSection title="BROKERAGE" items={brokerageItems} />
        <NavSection title="ACCOUNT" items={accountItems} />
      </div>

      {/* BOTTOM (aligned to same nav styling) */}
      <div className="flex-shrink-0 px-3 py-3 space-y-2">
        {/* Theme row - same padding/font/hover as nav items */}
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleTheme();
          }}
          className={[navBtnBase, collapsed && !isMobile ? "justify-center mx-1 px-0" : "justify-start"].join(" ")}
        >
          {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          {(!collapsed || isMobile) && <span className="text-sm font-medium ml-3">Theme</span>}
        </button>

        {/* Upgrade row - aligned like nav item, but styled as CTA */}
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            go("/pricing");
          }}
          className={[
            navBtnBase,
            "bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground hover:text-primary-foreground",
            collapsed && !isMobile ? "justify-center mx-1 px-0" : "justify-start",
          ].join(" ")}
        >
          <Zap className="h-[18px] w-[18px]" />
          {(!collapsed || isMobile) && <span className="text-sm font-semibold ml-3">Upgrade</span>}
        </button>
      </div>
    </>
  );

  // Mobile drawer
  if (isMobile) {
    return (
      <>
        {mobileOpen && <div className="fixed inset-0 bg-black/50 z-40" onPointerDown={() => setMobileOpen(false)} />}

        <aside
          className={`
            fixed left-0 top-0 z-50 h-screen w-72
            bg-sidebar flex flex-col
            transform transition-transform duration-300 ease-in-out
            ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          `}
        >
          {sidebarContent}
        </aside>
      </>
    );
  }

  // Desktop: in normal flow (no border lines on sidebar)
  return (
    <aside
      className={`
        ${collapsed ? "w-16" : "w-60"}
        bg-sidebar flex flex-col h-screen
        flex-shrink-0
        transition-all duration-300
      `}
    >
      {sidebarContent}
    </aside>
  );
}
