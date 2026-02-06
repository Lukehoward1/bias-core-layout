// src/components/AppSidebar.tsx
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

  const go = (url: string) => {
    navigate(url);
    if (isMobile) setMobileOpen(false);
  };

  const NavSection = ({ title, items }: { title: string; items: Item[] }) => (
    <div>
      {!collapsed && (
        <div className="px-3 mb-2">
          <h2 className="text-[11px] font-semibold uppercase text-muted-foreground">{title}</h2>
        </div>
      )}

      {items.map((item) => {
        const Icon = item.icon;
        const active = location.pathname === item.url || (item.url !== "/" && location.pathname.startsWith(item.url));

        return (
          <button
            key={item.url}
            onPointerDown={(e) => {
              e.preventDefault();
              go(item.url);
            }}
            className={`w-full flex items-center px-3 py-2 rounded-lg ${
              active ? "bg-sidebar-accent text-primary" : "hover:bg-sidebar-accent/50"
            }`}
          >
            <Icon className="h-4 w-4 mr-3" />
            {!collapsed && <span>{item.title}</span>}
          </button>
        );
      })}
    </div>
  );

  return (
    <aside className={`${collapsed ? "w-16" : "w-60"} h-screen bg-sidebar border-r flex flex-col transition-all`}>
      <div className="h-14 px-4 flex items-center justify-between border-b">
        <img src={sbLogo} className="h-7" />
        <Button variant="ghost" size="icon" onClick={toggleCollapsed}>
          {collapsed ? <ChevronRight /> : <ChevronLeft />}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <NavSection title="MAIN" items={mainItems} />
        <NavSection title="LEARNING" items={learningItems} />
        <NavSection title="BROKERAGE" items={brokerageItems} />
        <NavSection title="ACCOUNT" items={accountItems} />
      </div>

      <div className="p-3 border-t space-y-2">
        <Button variant="ghost" onClick={toggleTheme} className="w-full">
          {theme === "dark" ? <Sun /> : <Moon />}
          {!collapsed && <span className="ml-2">Theme</span>}
        </Button>

        {!collapsed && (
          <Button className="w-full bg-gradient-to-r from-primary to-accent">
            <Zap className="mr-2 h-4 w-4" /> Upgrade
          </Button>
        )}
      </div>
    </aside>
  );
}
