import * as React from "react";

type AppSidebarContextType = {
  collapsed: boolean;
  toggleCollapsed: () => void;
};

const AppSidebarContext = React.createContext<AppSidebarContextType | undefined>(undefined);

export function AppSidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false);

  const toggleCollapsed = () => {
    setCollapsed((prev) => !prev);
  };

  return (
    <AppSidebarContext.Provider value={{ collapsed, toggleCollapsed }}>
      {children}
    </AppSidebarContext.Provider>
  );
}

export function useAppSidebar() {
  const context = React.useContext(AppSidebarContext);
  if (!context) {
    throw new Error("useAppSidebar must be used within AppSidebarProvider");
  }
  return context;
}
