import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Play, FastForward, Rewind, Pause, Clock } from 'lucide-react';

interface ReplayModePanelProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ReplayModePanel({ isOpen, onOpenChange }: ReplayModePanelProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2.5 text-xs font-medium gap-1.5 border-border/50 hover:bg-muted"
        >
          <Play className="h-3.5 w-3.5" />
          Replay Mode
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Replay Mode
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="bg-muted/30 rounded-lg p-4 text-center">
            <div className="flex justify-center gap-2 mb-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Rewind className="h-5 w-5 text-primary" />
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Play className="h-5 w-5 text-primary" />
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Pause className="h-5 w-5 text-primary" />
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FastForward className="h-5 w-5 text-primary" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Replay Mode will allow candle-by-candle simulated backtesting.
            </p>
          </div>
          
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Coming Features:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Bar-by-bar chart playback
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Adjustable replay speed (1x - 100x)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Manual trade entry during replay
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Track hypothetical P&L in real-time
              </li>
            </ul>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
            <p className="text-xs text-center text-primary">
              Feature coming soon. Stay tuned for updates!
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
