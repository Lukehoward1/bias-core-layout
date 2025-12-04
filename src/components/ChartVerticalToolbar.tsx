import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { 
  MousePointer2,
  TrendingUp,
  Minus,
  ArrowRight,
  Square,
  Circle,
  MoveUpRight,
  Type,
  DollarSign,
  BarChart3,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Settings,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChartVerticalToolbarProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

type ToolId = 'cursor' | 'trendline' | 'horizontal' | 'ray' | 'rectangle' | 'ellipse' | 'arrow' | 'text' | 'price-label' | 'fib' | 'long' | 'short';

interface Tool {
  id: ToolId;
  name: string;
  icon: React.ReactNode;
}

const cursorTools: Tool[] = [
  { id: 'cursor', name: 'Select / Move', icon: <MousePointer2 className="h-4 w-4" /> },
];

const trendlineTools: Tool[] = [
  { id: 'trendline', name: 'Trend Line', icon: <TrendingUp className="h-4 w-4" /> },
  { id: 'horizontal', name: 'Horizontal Line', icon: <Minus className="h-4 w-4" /> },
  { id: 'ray', name: 'Ray / Extended Line', icon: <ArrowRight className="h-4 w-4" /> },
];

const shapeTools: Tool[] = [
  { id: 'rectangle', name: 'Rectangle', icon: <Square className="h-4 w-4" /> },
  { id: 'ellipse', name: 'Ellipse', icon: <Circle className="h-4 w-4" /> },
  { id: 'arrow', name: 'Arrow', icon: <MoveUpRight className="h-4 w-4" /> },
];

const textTools: Tool[] = [
  { id: 'text', name: 'Text Note', icon: <Type className="h-4 w-4" /> },
  { id: 'price-label', name: 'Price Label', icon: <DollarSign className="h-4 w-4" /> },
];

const fibTools: Tool[] = [
  { id: 'fib', name: 'Fibonacci Retracement', icon: <BarChart3 className="h-4 w-4" /> },
];

const positionTools: Tool[] = [
  { id: 'long', name: 'Long Position', icon: <span className="text-xs font-bold text-success">L</span> },
  { id: 'short', name: 'Short Position', icon: <span className="text-xs font-bold text-destructive">S</span> },
];

const indicators = [
  { id: 'ma', name: 'Moving Average', description: 'Simple/Exponential MA overlay' },
  { id: 'rsi', name: 'RSI', description: 'Relative Strength Index' },
  { id: 'atr', name: 'ATR', description: 'Average True Range' },
];

interface ToolGroupProps {
  tools: Tool[];
  activeTool: ToolId;
  onSelectTool: (id: ToolId) => void;
  groupIcon?: React.ReactNode;
}

function ToolGroup({ tools, activeTool, onSelectTool, groupIcon }: ToolGroupProps) {
  const isActive = tools.some(t => t.id === activeTool);
  const activeInGroup = tools.find(t => t.id === activeTool);
  const displayIcon = activeInGroup?.icon || groupIcon || tools[0]?.icon;

  if (tools.length === 1) {
    const tool = tools[0];
    return (
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-8 w-8 p-0",
          activeTool === tool.id
            ? "bg-primary/20 text-primary border border-primary/30"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
        onClick={() => onSelectTool(tool.id)}
        title={tool.name}
      >
        {tool.icon}
      </Button>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 w-8 p-0 relative",
            isActive
              ? "bg-primary/20 text-primary border border-primary/30"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
          title={tools.map(t => t.name).join(' / ')}
        >
          {displayIcon}
          <span className="absolute bottom-0.5 right-0.5 w-0 h-0 border-l-[4px] border-l-transparent border-b-[4px] border-b-muted-foreground/50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="left" align="start" className="w-48 p-1 bg-card border-border">
        {tools.map((tool) => (
          <button
            key={tool.id}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors",
              activeTool === tool.id
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
            onClick={() => onSelectTool(tool.id)}
          >
            {tool.icon}
            <span>{tool.name}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export function ChartVerticalToolbar({ onZoomIn, onZoomOut, onReset }: ChartVerticalToolbarProps) {
  const [activeTool, setActiveTool] = useState<ToolId>('cursor');
  const [activeIndicators, setActiveIndicators] = useState<string[]>([]);

  const toggleIndicator = (id: string) => {
    setActiveIndicators(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="absolute right-14 top-14 bottom-8 z-10 flex flex-col items-center py-2 px-1 bg-background/80 backdrop-blur-sm border border-border/50 rounded-lg">
      <div className="flex flex-col gap-1">
        {/* Cursor / Selection */}
        <ToolGroup tools={cursorTools} activeTool={activeTool} onSelectTool={setActiveTool} />
        
        <div className="w-6 h-px bg-border/50 mx-auto my-1" />
        
        {/* Trendline tools */}
        <ToolGroup tools={trendlineTools} activeTool={activeTool} onSelectTool={setActiveTool} />
        
        {/* Shapes */}
        <ToolGroup tools={shapeTools} activeTool={activeTool} onSelectTool={setActiveTool} />
        
        {/* Text & Labels */}
        <ToolGroup tools={textTools} activeTool={activeTool} onSelectTool={setActiveTool} />
        
        <div className="w-6 h-px bg-border/50 mx-auto my-1" />
        
        {/* Fibonacci */}
        <ToolGroup tools={fibTools} activeTool={activeTool} onSelectTool={setActiveTool} />
        
        {/* Position tools */}
        <ToolGroup tools={positionTools} activeTool={activeTool} onSelectTool={setActiveTool} />
      </div>

      <div className="flex-1" />

      <div className="flex flex-col gap-1">
        {/* Zoom controls */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
          onClick={onZoomIn}
          title="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
          onClick={onZoomOut}
          title="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
          onClick={onReset}
          title="Reset view"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>

        <div className="w-6 h-px bg-border/50 mx-auto my-1" />

        {/* Indicators */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
              title="Indicators"
            >
              <TrendingUp className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent side="left" align="end" className="w-72 bg-card border-border p-3">
            <div className="text-sm font-medium text-foreground mb-3">Indicators</div>
            <div className="space-y-3">
              {indicators.map((indicator) => (
                <div key={indicator.id} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-foreground flex items-center gap-2">
                      {indicator.name}
                      {activeIndicators.includes(indicator.id) && (
                        <Check className="h-3 w-3 text-success" />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{indicator.description}</div>
                  </div>
                  <Switch
                    checked={activeIndicators.includes(indicator.id)}
                    onCheckedChange={() => toggleIndicator(indicator.id)}
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border/50">
              Indicator overlays are visual only in demo mode.
            </p>
          </PopoverContent>
        </Popover>

        {/* Settings */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
              title="Chart Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent side="left" align="end" className="w-56 bg-card border-border p-3">
            <div className="text-sm font-medium text-foreground mb-2">Chart Settings</div>
            <p className="text-xs text-muted-foreground">
              Chart preferences and customization options coming soon.
            </p>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}