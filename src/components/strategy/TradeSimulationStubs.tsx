/**
 * Trade Simulation UI Stubs
 * 
 * These components are hidden stubs for future live-simulation mode.
 * They are not rendered yet but integrated for future activation.
 */

import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface TradeSimulationControlsProps {
  onBuy?: () => void;
  onSell?: () => void;
  onSetStopLoss?: (value: number) => void;
  onSetTakeProfit?: (value: number) => void;
  replaySpeed?: number;
  onReplaySpeedChange?: (speed: number) => void;
  onPlayPause?: () => void;
  onStepForward?: () => void;
  onStepBackward?: () => void;
  isPlaying?: boolean;
}

/**
 * Buy/Sell Buttons Component
 * For executing trades in simulation mode
 */
export function TradeButtons({ onBuy, onSell }: Pick<TradeSimulationControlsProps, 'onBuy' | 'onSell'>) {
  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        className="flex-1 bg-success/10 border-success/30 text-success hover:bg-success/20"
        onClick={onBuy}
      >
        <TrendingUp className="h-4 w-4 mr-2" />
        Buy
      </Button>
      <Button
        variant="outline"
        className="flex-1 bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/20"
        onClick={onSell}
      >
        <TrendingDown className="h-4 w-4 mr-2" />
        Sell
      </Button>
    </div>
  );
}

/**
 * Stop Loss / Take Profit Setters
 */
export function SLTPSetters({ 
  onSetStopLoss, 
  onSetTakeProfit 
}: Pick<TradeSimulationControlsProps, 'onSetStopLoss' | 'onSetTakeProfit'>) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Stop Loss (pips)</Label>
        <Input
          type="number"
          placeholder="20"
          className="h-8 bg-background border-border"
          onChange={(e) => onSetStopLoss?.(parseFloat(e.target.value))}
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Take Profit (pips)</Label>
        <Input
          type="number"
          placeholder="40"
          className="h-8 bg-background border-border"
          onChange={(e) => onSetTakeProfit?.(parseFloat(e.target.value))}
        />
      </div>
    </div>
  );
}

/**
 * Replay Speed Slider
 */
export function ReplaySpeedSlider({ 
  replaySpeed = 1, 
  onReplaySpeedChange 
}: Pick<TradeSimulationControlsProps, 'replaySpeed' | 'onReplaySpeedChange'>) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">Replay Speed</Label>
        <span className="text-xs text-foreground font-medium">{replaySpeed}x</span>
      </div>
      <Slider
        value={[replaySpeed]}
        onValueChange={([value]) => onReplaySpeedChange?.(value)}
        min={0.5}
        max={10}
        step={0.5}
        className="w-full"
      />
    </div>
  );
}

/**
 * Bar-by-Bar Playback Controller
 */
export function PlaybackController({ 
  isPlaying = false,
  onPlayPause,
  onStepForward,
  onStepBackward
}: Pick<TradeSimulationControlsProps, 'isPlaying' | 'onPlayPause' | 'onStepForward' | 'onStepBackward'>) {
  return (
    <div className="flex items-center justify-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={onStepBackward}
      >
        <SkipBack className="h-4 w-4" />
      </Button>
      <Button
        variant="default"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={onPlayPause}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={onStepForward}
      >
        <SkipForward className="h-4 w-4" />
      </Button>
    </div>
  );
}

/**
 * Full Trade Simulation Panel
 * Combines all simulation controls
 * 
 * NOTE: This component is NOT rendered yet.
 * It will be activated in future updates when live simulation mode is enabled.
 */
export function TradeSimulationPanel(props: TradeSimulationControlsProps) {
  return (
    <div className="p-4 space-y-4 bg-card border border-border rounded-lg">
      <div className="text-sm font-medium text-foreground">Trade Simulation</div>
      
      <TradeButtons onBuy={props.onBuy} onSell={props.onSell} />
      
      <SLTPSetters 
        onSetStopLoss={props.onSetStopLoss} 
        onSetTakeProfit={props.onSetTakeProfit} 
      />
      
      <div className="h-px bg-border" />
      
      <ReplaySpeedSlider 
        replaySpeed={props.replaySpeed} 
        onReplaySpeedChange={props.onReplaySpeedChange} 
      />
      
      <PlaybackController 
        isPlaying={props.isPlaying}
        onPlayPause={props.onPlayPause}
        onStepForward={props.onStepForward}
        onStepBackward={props.onStepBackward}
      />
    </div>
  );
}
