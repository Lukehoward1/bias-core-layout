import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAlertsContext } from "@/contexts/AlertsContext";

export function AlertsSoundToggle() {
  const { preferences, updatePreferences } = useAlertsContext();

  const toggleSound = () => {
    updatePreferences({
      ...preferences,
      soundEnabled: !preferences.soundEnabled
    });
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={toggleSound}
        >
          {preferences.soundEnabled ? (
            <Volume2 className="h-4 w-4" />
          ) : (
            <VolumeX className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {preferences.soundEnabled ? 'Sound On' : 'Sound Off'}
      </TooltipContent>
    </Tooltip>
  );
}
