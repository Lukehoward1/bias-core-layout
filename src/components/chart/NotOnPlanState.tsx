import { Lock } from 'lucide-react';

interface NotOnPlanStateProps {
  name: string;
}

export function NotOnPlanState({ name }: NotOnPlanStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
      <Lock className="h-8 w-8 text-muted-foreground/50" />
      <p className="text-sm text-muted-foreground">
        Live data for <span className="font-medium text-foreground">{name}</span> isn't available yet.
      </p>
    </div>
  );
}
