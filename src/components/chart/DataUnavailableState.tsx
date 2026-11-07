import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DataUnavailableStateProps {
  onRetry?: () => void;
}

export function DataUnavailableState({ onRetry }: DataUnavailableStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
      <AlertTriangle className="h-8 w-8 text-muted-foreground/50" />
      <div>
        <p className="text-sm font-medium text-foreground">Market data is temporarily unavailable.</p>
        {onRetry && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 text-xs text-muted-foreground gap-1.5"
            onClick={onRetry}
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}
