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
import { Separator } from "@/components/ui/separator";
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
  { title: "Billing & Subscription", url: "/billing", icon: CreditCard },
];

export function AppSidebar() {
  const { collapsed, toggleCollapsed } = useAppSidebar();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const currentPath = location.pathname;

  const NavSection = ({ title, items }: { title: string; items: typeof mainItems }) => (
    <div className="mb-6">
      {!collapsed && (
        <div className="px-3 mb-2">
          <h2 className="text-xs font-semibold text-muted-foreground tracking-wider">{title}</h2>
        </div>
      )}
      <div className="space-y-1">
        {items.map((item) => {
          const isActive = currentPath === item.url;
          const Icon = item.icon;
          
          return (
            <NavLink
              key={item.url}
              to={item.url}
              className={`
                flex items-center px-3 py-2 rounded-lg transition-all relative
                ${collapsed ? 'justify-center' : 'justify-start'}
                ${isActive 
                  ? 'bg-sidebar-accent text-sidebar-primary' 
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                }
              `}
            >
              {isActive && !collapsed && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
              )}
              <Icon className={`${collapsed ? '' : 'mr-3'} h-5 w-5 flex-shrink-0`} />
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
        ${collapsed ? 'w-16' : 'w-64'} 
        bg-sidebar border-r border-sidebar-border 
        flex flex-col h-screen transition-all duration-300 relative
      `}
    >
      {/* Logo */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={sbLogo} alt="StreamBias" className="h-8 w-8 flex-shrink-0" />
          {!collapsed && (
            <span className="text-lg font-bold text-foreground">StreamBias</span>
          )}
        </div>
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Collapse Button */}
      <div className="px-3 py-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleCollapsed}
          className="w-full justify-center hover:bg-sidebar-accent"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 overflow-y-auto">
        <NavSection title="MAIN" items={mainItems} />
        <NavSection title="LEARNING" items={learningItems} />
        <NavSection title="ACCOUNT" items={accountItems} />
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border space-y-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className={`w-full ${collapsed ? 'justify-center' : 'justify-start'} hover:bg-sidebar-accent`}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {!collapsed && <span className="ml-2">Theme</span>}
        </Button>
        
        {!collapsed && (
          <Button
            size="sm"
            className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
          >
            <Zap className="h-4 w-4 mr-2" />
            Upgrade
          </Button>
        )}
      </div>
    </aside>
  );
}
