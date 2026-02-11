import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;

/**
 * Force portal into <body> so we always escape app-shell stacking contexts.
 */
function DialogPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return <DialogPrimitive.Portal container={document.body}>{children}</DialogPrimitive.Portal>;
}

/**
 * ============================
 * Z-INDEX STACKING (IMPORTANT)
 * ============================
 * Each mounted DialogContent gets an increasing stack index so
 * nested dialogs always appear above the previous one.
 *
 * This avoids "dimming behind" / clicking does nothing issues when
 * opening a Dialog from inside another Dialog.
 */
let __dialogStackCounter = 0;
const BASE_Z = 9000; // keep high to sit above app shell

function useDialogStackZIndex(enabled: boolean) {
  const [z, setZ] = React.useState<number>(() => (enabled ? BASE_Z : BASE_Z));

  React.useEffect(() => {
    if (!enabled) return;
    __dialogStackCounter += 1;
    const myIndex = __dialogStackCounter;
    // overlay uses z, content uses z+1
    setZ(BASE_Z + myIndex * 2);
    // no decrement on unmount; monotonic is fine for UI layering
  }, [enabled]);

  return z;
}

type DialogOverlayProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay> & {
  /** Override the computed z-index (rarely needed) */
  zIndex?: number;
};

const DialogOverlay = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Overlay>, DialogOverlayProps>(
  ({ className, zIndex, ...props }, ref) => (
    <DialogPrimitive.Overlay
      ref={ref}
      style={zIndex ? { zIndex } : undefined}
      className={cn(
        "fixed inset-0 bg-black/40 backdrop-blur-sm",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
        className,
      )}
      {...props}
    />
  ),
);
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

type DialogContentProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  /**
   * If true (default), this Dialog will auto-stack above any already-open Dialog.
   * Turn off only if you are controlling z-index externally.
   */
  stack?: boolean;
};

const DialogContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, DialogContentProps>(
  ({ className, children, stack = true, ...props }, ref) => {
    const z = useDialogStackZIndex(stack);

    return (
      <DialogPortal>
        {/* Overlay sits just below content */}
        <DialogOverlay zIndex={z} />

        <DialogPrimitive.Content
          ref={ref}
          style={{ zIndex: z + 1 }}
          className={cn(
            "fixed left-[50%] top-[50%] grid w-full translate-x-[-50%] translate-y-[-50%] gap-4",
            "border bg-background shadow-lg duration-200 sm:rounded-lg",
            "max-w-lg p-6",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
            "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
            "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
            "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
            className,
          )}
          {...props}
        >
          {children}
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPortal>
    );
  },
);
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
