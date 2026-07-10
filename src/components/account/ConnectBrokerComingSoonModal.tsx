import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plug } from "lucide-react";

interface ConnectBrokerComingSoonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConnectBrokerComingSoonModal({ open, onOpenChange }: ConnectBrokerComingSoonModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Plug className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-lg">Connect Broker Account</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            Broker integration is coming soon. We're working on secure MT4/MT5 connections so you
            can sync your trades automatically. Check back shortly!
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
