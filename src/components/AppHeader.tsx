import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, User, LogOut, Sparkles, Lock } from "lucide-react";
import { useSessionLock } from "@/hooks/use-session-lock";

interface AppHeaderProps {
  title: string;
  rightContent?: React.ReactNode;
}

export function AppHeader({ title, rightContent }: AppHeaderProps) {
  const { lock } = useSessionLock();

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-6 gap-6 shrink-0 sticky top-0 z-30">
      <h1 className="text-xl font-semibold text-foreground shrink-0">{title}</h1>
      
      {/* Global Smart Search */}
      <div className="relative flex-1 max-w-xl hidden md:block">
        <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Smart Search (Coming Soon)"
          disabled
          className="pl-10 h-9 bg-muted/50 border-muted text-sm"
        />
      </div>
      
      <div className="flex items-center gap-4 shrink-0">
        {rightContent}
        <Badge variant="secondary" className="text-xs font-medium h-6 px-2.5">
          Pro
        </Badge>
        
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                JD
              </AvatarFallback>
            </Avatar>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="py-2">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">John Doe</p>
                <p className="text-xs text-muted-foreground">john@example.com</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="py-2">
              <User className="mr-2.5 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="py-2" onClick={lock}>
              <Lock className="mr-2.5 h-4 w-4" />
              Lock now
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="py-2">
              <LogOut className="mr-2.5 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
