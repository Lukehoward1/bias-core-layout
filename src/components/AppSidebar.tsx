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
  Zap
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAppSidebar } from "@/hooks/use-app-sidebar";
import { useTheme } from "@/hooks/use-theme";
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

const accountItems = [
  { title: "Broker Connections", url: "/broker-connections", icon: Link2 },
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Subscriptions", url: "/billing", icon: CreditCard },
];

export function AppSidebar() {
  const { collapsed, toggleCollapsed } = useAppSidebar();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const currentPath = location.pathname;

  const NavSection = ({ title, items }: { title: string; items: typeof mainItems }) => (
    <div className="space-y-1">
      {!collapsed && (
        <div className="px-3 pb-2">
          <h2 className="text-[11px] font-semibold text-muted-foreground tracking-wider uppercase">{title}</h2>
        </div>
      )}
      <div className="space-y-0.5">
        {items.map((item) => {
          const isActive = currentPath === item.url;
          const Icon = item.icon;
          
          return (
            <NavLink
              key={item.url}
              to={item.url}
              className={`
                flex items-center px-3 py-2.5 rounded-lg transition-all relative
                ${collapsed ? 'justify-center mx-1' : 'justify-start'}
                ${isActive 
                  ? 'bg-sidebar-accent text-sidebar-primary' 
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                }
              `}
            >
              {isActive && !collapsed && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
              )}
              <Icon className={`${collapsed ? '' : 'mr-3'} h-[18px] w-[18px] flex-shrink-0`} />
              {!collapsed && <span className="text-sm font-medium">{item.title}</span>}
            </NavLink>
          );
        })}
      </div>
    </div>
  );

  return (
    <aside 
      className={`
        ${collapsed ? 'w-16' : 'w-60'} 
        bg-sidebar
        flex flex-col h-screen transition-all duration-300
        fixed left-0 top-0 z-40 overflow-y-auto overflow-x-hidden
      `}
    >
      {/* TOP SECTION: Logo, Collapse Button, Main Nav */}
      <div className="flex-shrink-0">
        {/* Logo - aligned with main header h-14 */}
        <div className={`h-14 ${collapsed ? 'px-3' : 'px-4'} flex items-center justify-between border-b border-border`}>
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
            <img src={sbLogo} alt="StreamBias" className={`${collapsed ? 'h-7' : 'h-8'} w-auto flex-shrink-0`} />
            {!collapsed && (
              <span className="text-lg font-bold text-foreground">StreamBias</span>
            )}
          </div>
        </div>

        {/* Collapse Button */}
        <div className="px-3 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleCollapsed}
            className={`w-full justify-center hover:bg-sidebar-accent h-9 ${collapsed ? 'px-0' : ''}`}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Main Navigation */}
        <nav className="px-3 pt-1 pb-4">
          <NavSection title="MAIN" items={mainItems} />
        </nav>
      </div>

      {/* MIDDLE SECTION: Learning (centered vertically) */}
      <div className="flex-1 flex items-center">
        <nav className="px-3 w-full">
          <NavSection title="LEARNING" items={learningItems} />
        </nav>
      </div>

      {/* BOTTOM SECTION: Account + Theme/Upgrade */}
      <div className="flex-shrink-0">
        <nav className="px-3 py-4">
          <NavSection title="ACCOUNT" items={accountItems} />
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-sidebar-border space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className={`w-full h-9 ${collapsed ? 'justify-center px-0' : 'justify-start px-3'} hover:bg-sidebar-accent`}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {!collapsed && <span className="ml-3 text-sm">Theme</span>}
          </Button>
          
          {!collapsed && (
            <Button
              size="sm"
              className="w-full h-9 bg-gradient-to-r from-primary to-accent hover:opacity-90"
            >
              <Zap className="h-4 w-4 mr-2" />
              Upgrade
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
}
