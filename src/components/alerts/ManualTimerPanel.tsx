import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Timer, Plus, Trash2, Play, Pause } from "lucide-react";

interface ManualTimer {
  id: string;
  label: string;
  durationMinutes: number;
  remainingSeconds: number;
  isRunning: boolean;
  createdAt: Date;
}

interface ManualTimerPanelProps {
  onTimerComplete: (label: string) => void;
}

export function ManualTimerPanel({ onTimerComplete }: ManualTimerPanelProps) {
  const [timers, setTimers] = useState<ManualTimer[]>([]);
  const [newLabel, setNewLabel] = useState('');
  const [newDuration, setNewDuration] = useState('15');

  const addTimer = () => {
    if (!newLabel.trim()) return;
    
    const duration = parseInt(newDuration) || 15;
    const timer: ManualTimer = {
      id: Math.random().toString(36).substr(2, 9),
      label: newLabel.trim(),
      durationMinutes: duration,
      remainingSeconds: duration * 60,
      isRunning: false,
      createdAt: new Date()
    };
    
    setTimers(prev => [...prev, timer]);
    setNewLabel('');
    setNewDuration('15');
  };

  const toggleTimer = (id: string) => {
    setTimers(prev => prev.map(t => 
      t.id === id ? { ...t, isRunning: !t.isRunning } : t
    ));
  };

  const removeTimer = (id: string) => {
    setTimers(prev => prev.filter(t => t.id !== id));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Timer tick effect
  useState(() => {
    const interval = setInterval(() => {
      setTimers(prev => prev.map(timer => {
        if (!timer.isRunning || timer.remainingSeconds <= 0) return timer;
        
        const newRemaining = timer.remainingSeconds - 1;
        if (newRemaining <= 0) {
          onTimerComplete(timer.label);
          return { ...timer, remainingSeconds: 0, isRunning: false };
        }
        return { ...timer, remainingSeconds: newRemaining };
      }));
    }, 1000);
    
    return () => clearInterval(interval);
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Timer className="h-4 w-4 text-primary" />
          Manual Timers
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Timer Form */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="Timer label..."
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="h-8 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && addTimer()}
            />
          </div>
          <div className="w-20">
            <Input
              type="number"
              placeholder="Min"
              value={newDuration}
              onChange={(e) => setNewDuration(e.target.value)}
              className="h-8 text-sm"
              min={1}
              max={480}
            />
          </div>
          <Button size="sm" onClick={addTimer} className="h-8 px-2">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Timer List */}
        {timers.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No active timers. Add one above.
          </p>
        ) : (
          <div className="space-y-2">
            {timers.map(timer => (
              <div
                key={timer.id}
                className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => toggleTimer(timer.id)}
                  >
                    {timer.isRunning ? (
                      <Pause className="h-3.5 w-3.5" />
                    ) : (
                      <Play className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <span className="text-sm font-medium">{timer.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={timer.remainingSeconds <= 60 ? "destructive" : "secondary"}
                    className="font-mono text-xs"
                  >
                    {formatTime(timer.remainingSeconds)}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeTimer(timer.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
