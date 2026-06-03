import {
  LayoutDashboard,
  TrendingUp,
  Calendar,
  Bell,
  Calculator,
  BookOpen,
  FileText,
  Lightbulb,
  Settings,
  CreditCard,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
  Zap,
  X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAppSidebar } from "@/hooks/use-app-sidebar";
import { useTheme } from "@/hooks/use-theme";
import { useIsMobile } from "@/hooks/use-mobile";
import sbLogo from "@/assets/sb-logo.svg";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type Item = { title: string; url: string; icon: any };

const mainItems: Item[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Markets", url: "/markets", icon: TrendingUp },
  { title: "Alerts", url: "/alerts", icon: Bell },
  { title: "Calendar", url: "/calendar", icon: Calendar },
  { title: "Risk Tools", url: "/risk-tools", icon: Calculator },
  { title: "Journal", url: "/journal", icon: BookOpen },
];

const learningItems: Item[] = [
  { title: "Guides", url: "/education", icon: FileText },
  { title: "Trading Tips", url: "/education?view=tips", icon: Lightbulb },
];

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

  const navBtnBase = `
    w-full text-left
    flex items-center rounded-lg transition-all relative
    px-3 py-2
    hover:bg-sidebar-accent/50
    text-sidebar-foreground
    select-none
  `;

  const WithCollapsedTooltip = ({ label, children }: { label: string; children: React.ReactNode }) => {
    if (!collapsed || isMobile) return <>{children}</>;

    return (
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side="right" align="center">
          {label}
        </TooltipContent>
      </Tooltip>
    );
  };

  const NavSection = ({ title, items }: { title: string; items: Item[] }) => (
    <div className={collapsed && !isMobile ? "pt-1" : ""}>
      {!collapsed && (
        <div className="px-3 mb-2">
          <h2 className="text-[11px] font-semibold text-muted-foreground tracking-wider uppercase">{title}</h2>
        </div>
      )}

      <div className="space-y-0.5">
        {items.map((item) => {
          const isActive = (() => {
            if (item.url.includes('?')) {
              // Item URL has query params — match both path and those params
              const [path, qs] = item.url.split('?');
              if (currentPath !== path) return false;
              const needed = new URLSearchParams(qs);
              const actual = new URLSearchParams(location.search);
              let ok = true;
              needed.forEach((v, k) => { if (actual.get(k) !== v) ok = false; });
              return ok;
            }
            // Plain path item — skip if a more-specific (query-param) sibling already matches
            if (location.search && currentPath === item.url) return false;
            return currentPath === item.url || (item.url !== "/" && currentPath.startsWith(item.url));
          })();
          const Icon = item.icon;

          const btn = (
            <button
              key={item.url}
              type="button"
              onPointerDown={(e) => {
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
                isActive ? "bg-sidebar-accent text-sidebar-primary ring-1 ring-primary/20" : "",
              ].join(" ")}
              aria-current={isActive ? "page" : undefined}
              title={collapsed && !isMobile ? item.title : undefined}
            >
              {isActive && !collapsed && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full" />
              )}

              <Icon className={`${collapsed && !isMobile ? "" : "mr-3"} h-[18px] w-[18px] flex-shrink-0`} />
              {(!collapsed || isMobile) && <span className="text-sm font-medium">{item.title}</span>}
            </button>
          );

          return (
            <WithCollapsedTooltip key={item.url} label={item.title}>
              {btn}
            </WithCollapsedTooltip>
          );
        })}
      </div>
    </div>
  );

  const sidebarContent = (
    <>
      <div className="flex-shrink-0">
        <div className={`h-14 ${collapsed && !isMobile ? "px-3" : "px-4"} flex items-center justify-between`}>
          <div className={`flex items-center ${collapsed && !isMobile ? "justify-center" : "gap-3"}`}>
            <img src={sbLogo} alt="StreamBias" className="h-10 w-auto flex-shrink-0" />
            {(!collapsed || isMobile) && <span className="text-lg font-bold text-foreground">StreamBias</span>}
          </div>

          {isMobile && (
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

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

      <div
        className={[
          "flex-1 flex flex-col overflow-y-auto px-3 py-2",
          collapsed && !isMobile ? "space-y-4" : "space-y-5",
        ].join(" ")}
      >
        <NavSection title="MAIN" items={mainItems} />
        <NavSection title="LEARNING" items={learningItems} />
        <NavSection title="ACCOUNT" items={accountItems} />
      </div>

      <div className="flex-shrink-0 px-3 py-3 space-y-2">
        <WithCollapsedTooltip label="Theme">
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleTheme();
            }}
            className={[navBtnBase, collapsed && !isMobile ? "justify-center mx-1 px-0" : "justify-start"].join(" ")}
            title={collapsed && !isMobile ? "Theme" : undefined}
          >
            {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            {(!collapsed || isMobile) && <span className="text-sm font-medium ml-3">Theme</span>}
          </button>
        </WithCollapsedTooltip>

        <WithCollapsedTooltip label="Upgrade">
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
            title={collapsed && !isMobile ? "Upgrade" : undefined}
          >
            <Zap className="h-[18px] w-[18px]" />
            {(!collapsed || isMobile) && <span className="text-sm font-semibold ml-3">Upgrade</span>}
          </button>
        </WithCollapsedTooltip>
      </div>
    </>
  );

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
