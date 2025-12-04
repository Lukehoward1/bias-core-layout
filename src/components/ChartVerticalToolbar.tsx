import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  MousePointer2,
  TrendingUp,
  Minus,
  ArrowRight,
  Square,
  Circle,
  Type,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Settings,
  Crosshair,
  Ruler,
  Camera,
  Brush,
  ArrowDown,
  ArrowUp,
  Trash2,
  PenTool,
  Highlighter,
  Triangle,
  MoveHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChartVerticalToolbarProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onClearDrawings?: () => void;
}

type ToolId = 
  | 'cursor' 
  | 'crosshair' 
  | 'trendline' 
  | 'horizontal' 
  | 'horizontal-ray' 
  | 'vertical' 
  | 'ray'
  | 'extended' 
  | 'rectangle' 
  | 'circle'
  | 'path' 
  | 'pen'
  | 'marker'
  | 'fib-retracement'
  | 'measure'
  | 'delete';

interface Tool {
  id: ToolId;
  name: string;
  icon: React.ReactNode;
}

const cursorTools: Tool[] = [
  { id: 'cursor', name: 'Select / Move', icon: <MousePointer2 className="h-4 w-4" /> },
];

const crosshairTools: Tool[] = [
  { id: 'crosshair', name: 'Crosshair', icon: <Crosshair className="h-4 w-4" /> },
];

const trendlineTools: Tool[] = [
  { id: 'trendline', name: 'Trend Line', icon: <TrendingUp className="h-4 w-4" /> },
  { id: 'ray', name: 'Ray', icon: <ArrowRight className="h-4 w-4" /> },
  { id: 'extended', name: 'Extended Line', icon: <MoveHorizontal className="h-4 w-4" /> },
  { id: 'horizontal', name: 'Horizontal Line', icon: <Minus className="h-4 w-4" /> },
  { id: 'vertical', name: 'Vertical Line', icon: <ArrowDown className="h-4 w-4" /> },
];

const shapeTools: Tool[] = [
  { id: 'rectangle', name: 'Rectangle', icon: <Square className="h-4 w-4" /> },
  { id: 'circle', name: 'Circle', icon: <Circle className="h-4 w-4" /> },
  { id: 'path', name: 'Path', icon: <Triangle className="h-4 w-4" /> },
];

const brushTools: Tool[] = [
  { id: 'pen', name: 'Pen', icon: <PenTool className="h-4 w-4" /> },
  { id: 'marker', name: 'Marker', icon: <Highlighter className="h-4 w-4" /> },
];

const fibTools: Tool[] = [
  { id: 'fib-retracement', name: 'Fibonacci Retracement', icon: <Type className="h-4 w-4" /> },
];

const measureTools: Tool[] = [
  { id: 'measure', name: 'Distance / Range Tool', icon: <Ruler className="h-4 w-4" /> },
];

const deleteTools: Tool[] = [
  { id: 'delete', name: 'Delete / Clear', icon: <Trash2 className="h-4 w-4" /> },
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
          "h-7 w-7 p-0 transition-all",
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
            "h-7 w-7 p-0 relative transition-all",
            isActive
              ? "bg-primary/20 text-primary border border-primary/30"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
          title={tools.map(t => t.name).join(' / ')}
        >
          {displayIcon}
          <span className="absolute bottom-0 right-0 w-0 h-0 border-l-[3px] border-l-transparent border-b-[3px] border-b-muted-foreground/40" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="left" align="start" className="w-44 p-1 bg-card border-border z-[200]">
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

export function ChartVerticalToolbar({ onZoomIn, onZoomOut, onReset, onClearDrawings }: ChartVerticalToolbarProps) {
  const [activeTool, setActiveTool] = useState<ToolId>('cursor');

  return (
    <div className="w-full h-full flex flex-col items-center py-1.5 px-1 bg-background/95 backdrop-blur-sm border-l border-border/50">
      <div className="flex flex-col gap-0.5">
        {/* Cursor / Selection */}
        <ToolGroup tools={cursorTools} activeTool={activeTool} onSelectTool={setActiveTool} />
        
        {/* Crosshair */}
        <ToolGroup tools={crosshairTools} activeTool={activeTool} onSelectTool={setActiveTool} />
        
        <div className="w-5 h-px bg-border/50 mx-auto my-1" />
        
        {/* Trendline tools */}
        <ToolGroup tools={trendlineTools} activeTool={activeTool} onSelectTool={setActiveTool} />
        
        {/* Shapes */}
        <ToolGroup tools={shapeTools} activeTool={activeTool} onSelectTool={setActiveTool} />
        
        {/* Brush / Marker */}
        <ToolGroup tools={brushTools} activeTool={activeTool} onSelectTool={setActiveTool} />
        
        {/* Fibonacci */}
        <ToolGroup tools={fibTools} activeTool={activeTool} onSelectTool={setActiveTool} />
        
        <div className="w-5 h-px bg-border/50 mx-auto my-1" />
        
        {/* Measure Tool */}
        <ToolGroup tools={measureTools} activeTool={activeTool} onSelectTool={setActiveTool} />

        {/* Delete Tool */}
        <ToolGroup tools={deleteTools} activeTool={activeTool} onSelectTool={setActiveTool} />
      </div>

      <div className="flex-1" />

      <div className="flex flex-col gap-0.5">
        {/* Zoom controls */}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          onClick={onZoomIn}
          title="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          onClick={onZoomOut}
          title="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          onClick={onReset}
          title="Reset view"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>

        <div className="w-5 h-px bg-border/50 mx-auto my-1" />

        {/* Screenshot */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              title="Screenshot"
            >
              <Camera className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent side="left" align="end" className="w-48 bg-card border-border p-3 z-[200]">
            <div className="text-sm font-medium text-foreground mb-2">Screenshot</div>
            <p className="text-xs text-muted-foreground">
              Export coming soon.
            </p>
          </PopoverContent>
        </Popover>

        {/* Settings */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              title="Chart Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent side="left" align="end" className="w-48 bg-card border-border p-3 z-[200]">
            <div className="text-sm font-medium text-foreground mb-2">Chart Settings</div>
            <p className="text-xs text-muted-foreground">
              Preferences coming soon.
            </p>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}