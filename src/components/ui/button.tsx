import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { useTapHandler } from "@/hooks/use-tap-handler";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, onClick, disabled, ...props }, ref) => {
    const tap = useTapHandler();
    const Comp = asChild ? Slot : "button";

    // Attach a pointer-based tap handler that fires the same onClick.
    // Fixes iOS Safari environments where native click doesn't reach the
    // element on tap (see src/hooks/use-tap-handler.ts). Mouse input
    // short-circuits inside the hook so desktop clicks stay on the native
    // path unchanged, and the 10px movement threshold means the tap is
    // cancelled the moment the user starts a scroll gesture.
    // Callers can still override any of onPointerDown/Move/Up/Cancel by
    // passing their own handler in props — spread order below keeps their
    // handler last so it wins (see AppHeader's mobile menu button).
    const tapHandlers = !disabled && onClick
      ? tap((e) => onClick(e as unknown as React.MouseEvent<HTMLButtonElement>))
      : undefined;

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        onClick={onClick}
        disabled={disabled}
        {...tapHandlers}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
