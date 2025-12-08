import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Zap } from "lucide-react";

interface TipCardProps {
  title: string;
  content: string;
  category: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  onClick: () => void;
}

export function TipCard({ title, content, category, level, onClick }: TipCardProps) {
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Beginner': return 'bg-success/20 text-success border-success/30';
      case 'Intermediate': return 'bg-warning/20 text-warning border-warning/30';
      case 'Advanced': return 'bg-destructive/20 text-destructive border-destructive/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Risk Management': return 'bg-destructive/10 text-destructive';
      case 'Charting': return 'bg-primary/10 text-primary';
      case 'Execution': return 'bg-success/10 text-success';
      case 'Psychology': return 'bg-warning/10 text-warning';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card 
      className="group cursor-pointer hover:border-warning/50 transition-all duration-200 hover:shadow-lg hover:shadow-warning/5 bg-gradient-to-br from-card to-warning/5"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-warning/20 text-warning shrink-0">
            <Lightbulb className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant="outline" className={`text-[10px] ${getCategoryColor(category)}`}>
                {category}
              </Badge>
              <Badge variant="outline" className={`text-[10px] ${getLevelColor(level)}`}>
                {level}
              </Badge>
            </div>
            <h4 className="font-semibold text-foreground text-sm mb-1.5 group-hover:text-warning transition-colors line-clamp-2">
              {title}
            </h4>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {content}
            </p>
          </div>
          <Zap className="h-4 w-4 text-warning/50 group-hover:text-warning transition-colors shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}
