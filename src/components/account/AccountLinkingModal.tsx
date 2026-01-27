import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link2, Clock } from "lucide-react";

interface AccountLinkingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountLinkingModal({ open, onOpenChange }: AccountLinkingModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Link2 className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-lg">Account linking is coming soon</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground pt-2">
            For launch, Risk Tools supports manual balance entry. Account linking will be available for paid plans.
          </DialogDescription>
        </DialogHeader>
        
        <div className="p-4 rounded-lg bg-muted/50 border border-border my-2">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">What to expect</p>
              <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                <li>• Auto-sync account balance</li>
                <li>• Real-time position tracking</li>
                <li>• Streamlined risk sizing</li>
              </ul>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
