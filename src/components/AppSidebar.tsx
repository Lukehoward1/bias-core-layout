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
  X
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

const brokerageItems = [
  { title: "Brokerage", url: "/brokerage", icon: Link2 },
];

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
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const NavSection = ({ title, items }: { title: string; items: typeof mainItems }) => (
    <div className="space-y-1">
      {!collapsed && (
        <div className="px-3 pb-2">
          <h2 className="text-[11px] font-semibold text-muted-foreground tracking-wider uppercase">{title}</h2>
        </div>
      )}
      <div className="space-y-0.5">
        {items.map((item) => {
          const isActive = currentPath === item.url || 
            (item.url !== '/' && currentPath.startsWith(item.url));
          const Icon = item.icon;
          
          return (
            <NavLink
              key={item.url}
              to={item.url}
              onClick={handleNavClick}
              className={`
                flex items-center px-3 py-2.5 rounded-lg transition-all relative
                ${collapsed && !isMobile ? 'justify-center mx-1' : 'justify-start'}
                ${isActive 
                  ? 'bg-sidebar-accent text-sidebar-primary' 
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                }
              `}
            >
              {isActive && !collapsed && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
              )}
              <Icon className={`${collapsed && !isMobile ? '' : 'mr-3'} h-[18px] w-[18px] flex-shrink-0`} />
              {(!collapsed || isMobile) && <span className="text-sm font-medium">{item.title}</span>}
            </NavLink>
          );
        })}
      </div>
    </div>
  );

  const sidebarContent = (
    <>
      {/* TOP SECTION: Logo, Collapse Button */}
      <div className="flex-shrink-0">
        {/* Logo - aligned with main header h-14 */}
        <div className={`h-14 ${collapsed && !isMobile ? 'px-3' : 'px-4'} flex items-center justify-between border-b border-border`}>
          <div className={`flex items-center ${collapsed && !isMobile ? 'justify-center' : 'gap-3'}`}>
            <img src={sbLogo} alt="StreamBias" className={`${collapsed && !isMobile ? 'h-7' : 'h-8'} w-auto flex-shrink-0`} />
            {(!collapsed || isMobile) && (
              <span className="text-lg font-bold text-foreground">StreamBias</span>
            )}
          </div>
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Collapse Button - Desktop only */}
        {!isMobile && (
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
        )}

        {/* Main Navigation */}
        <nav className="px-3 pt-1 pb-4">
          <NavSection title="MAIN" items={mainItems} />
        </nav>
      </div>

      {/* MIDDLE SECTION: Learning + Brokerage - flex-1 to take available space */}
      <div className="flex-1 flex flex-col justify-center gap-6 min-h-0">
        <nav className="px-3 w-full">
          <NavSection title="LEARNING" items={learningItems} />
        </nav>
        <nav className="px-3 w-full">
          <NavSection title="BROKERAGE" items={brokerageItems} />
        </nav>
      </div>

      {/* BOTTOM SECTION: Account + Theme/Upgrade - pinned to bottom */}
      <div className="flex-shrink-0 mt-auto">
        <nav className="px-3 py-4">
          <NavSection title="ACCOUNT" items={accountItems} />
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-sidebar-border space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className={`w-full h-9 ${collapsed && !isMobile ? 'justify-center px-0' : 'justify-start px-3'} hover:bg-sidebar-accent`}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {(!collapsed || isMobile) && <span className="ml-3 text-sm">Theme</span>}
          </Button>
          
          {(!collapsed || isMobile) && (
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
    </>
  );

  // Mobile: Overlay drawer
  if (isMobile) {
    return (
      <>
        {/* Overlay backdrop */}
        {mobileOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setMobileOpen(false)}
          />
        )}
        
        {/* Slide-out drawer */}
        <aside 
          className={`
            fixed left-0 top-0 z-50 h-full w-72
            bg-sidebar flex flex-col
            transform transition-transform duration-300 ease-in-out
            ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
            overflow-y-auto
          `}
        >
          {sidebarContent}
        </aside>
      </>
    );
  }

  // Desktop: Fixed sidebar (no scroll)
  return (
    <aside 
      className={`
        ${collapsed ? 'w-16' : 'w-60'} 
        bg-sidebar
        flex flex-col h-screen
        fixed left-0 top-0 z-40
        transition-all duration-300
      `}
    >
      {sidebarContent}
    </aside>
  );
}
