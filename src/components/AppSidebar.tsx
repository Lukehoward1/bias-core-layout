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
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAppSidebar } from "@/hooks/use-app-sidebar";
import { useTheme } from "@/hooks/use-theme";
import { useIsMobile } from "@/hooks/use-mobile";
import sbLogo from "@/assets/sb-logo.svg";

const mainItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Markets", url: "/markets", icon: TrendingUp },
  { title: "Calendar", url: "/calendar", icon: Calendar },
  { title: "Alerts", url: "/alerts", icon: Bell },
  { title: "Risk Tools", url: "/risk-tools", icon: Calculator },
  { title: "Journal", url: "/journal", icon: BookOpen },
  { title: "Strategy Tester", url: "/strategy-tester", icon: Beaker },
  { title: "Community", url: "/community", icon: Users },
];

const learningItems = [
  { title: "Education", url: "/education", icon: GraduationCap },
  { title: "Webinars", url: "/webinars", icon: Video },
];

const brokerageItems = [{ title: "Brokerage", url: "/brokerage", icon: Link2 }];

const accountItems = [
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Subscriptions", url: "/billing", icon: CreditCard },
];

export function AppSidebar() {
  const { collapsed, toggleCollapsed, mobileOpen, setMobileOpen } = useAppSidebar();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const currentPath = location.pathname;
  const isMobile = useIsMobile();

  const handleNavClick = () => {
    console.log("NAV CLICK");
    if (isMobile) setMobileOpen(false);
  };

  const NavSection = ({ title, items }: { title: string; items: typeof mainItems }) => (
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
            <NavLink
              key={item.url}
              to={item.url}
              onClick={handleNavClick}
              className={`
                flex items-center px-3 py-2 rounded-lg transition-all relative
                ${collapsed && !isMobile ? "justify-center mx-1" : "justify-start"}
                ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                }
              `}
            >
              {isActive && !collapsed && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full" />
              )}
              <Icon className={`${collapsed && !isMobile ? "" : "mr-3"} h-[18px] w-[18px] flex-shrink-0`} />
              {(!collapsed || isMobile) && <span className="text-sm font-medium">{item.title}</span>}
            </NavLink>
          );
        })}
      </div>
    </div>
  );

  const sidebarContent = (
    <>
      {/* TOP */}
      <div className="flex-shrink-0">
        <div
          className={`h-14 ${
            collapsed && !isMobile ? "px-3" : "px-4"
          } flex items-center justify-between border-b border-border`}
        >
          <div className={`flex items-center ${collapsed && !isMobile ? "justify-center" : "gap-3"}`}>
            <img src={sbLogo} alt="StreamBias" className={`${collapsed && !isMobile ? "h-7" : "h-8"} w-auto`} />
            {(!collapsed || isMobile) && <span className="text-lg font-bold">StreamBias</span>}
          </div>

          {isMobile && (
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {!isMobile && (
          <div className="px-3 py-2">
            <Button variant="ghost" size="sm" onClick={toggleCollapsed} className="w-full h-8 justify-center">
              {collapsed ? <ChevronRight /> : <ChevronLeft />}
            </Button>
          </div>
        )}
      </div>

      {/* NAV */}
      <div className="flex-1 flex flex-col overflow-y-auto px-3 py-2 space-y-5">
        <NavSection title="MAIN" items={mainItems} />
        <NavSection title="LEARNING" items={learningItems as any} />
        <NavSection title="BROKERAGE" items={brokerageItems as any} />
        <NavSection title="ACCOUNT" items={accountItems as any} />
      </div>

      {/* FOOTER */}
      <div className="flex-shrink-0 px-3 py-3 border-t space-y-2">
        <Button variant="ghost" size="sm" onClick={toggleTheme} className="w-full h-8">
          {theme === "dark" ? <Sun /> : <Moon />}
          {(!collapsed || isMobile) && <span className="ml-3">Theme</span>}
        </Button>

        {(!collapsed || isMobile) && (
          <Button size="sm" className="w-full h-8">
            <Zap className="mr-2" />
            Upgrade
          </Button>
        )}
      </div>
    </>
  );

  // MOBILE
  if (isMobile) {
    return (
      <>
        {mobileOpen && <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setMobileOpen(false)} />}

        <aside className="fixed left-0 top-0 z-50 h-screen w-72 bg-sidebar">{sidebarContent}</aside>
      </>
    );
  }

  // DESKTOP (✅ FIXED)
  return (
    <aside
      className={`
        ${collapsed ? "w-16" : "w-60"}
        bg-sidebar
        flex flex-col h-screen
        relative
        transition-all duration-300
      `}
    >
      {sidebarContent}
    </aside>
  );
}
