import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Bookmark, Play, FileText, Video, GraduationCap } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ResourceCardProps {
  title: string;
  description: string;
  duration: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  type: 'video' | 'pdf' | 'course' | 'lesson';
  progress?: number;
  isBookmarked?: boolean;
  onClick: () => void;
  onBookmark?: () => void;
}

export function ResourceCard({ 
  title, 
  description, 
  duration, 
  level, 
  type,
  progress = 0,
  isBookmarked = false,
  onClick,
  onBookmark
}: ResourceCardProps) {
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Beginner': return 'bg-success/20 text-success border-success/30';
      case 'Intermediate': return 'bg-warning/20 text-warning border-warning/30';
      case 'Advanced': return 'bg-destructive/20 text-destructive border-destructive/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTypeIcon = () => {
    switch (type) {
      case 'video': return <Video className="h-4 w-4" />;
      case 'pdf': return <FileText className="h-4 w-4" />;
      case 'course': return <GraduationCap className="h-4 w-4" />;
      case 'lesson': return <Play className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeLabel = () => {
    switch (type) {
      case 'video': return 'Video';
      case 'pdf': return 'PDF Guide';
      case 'course': return 'Course';
      case 'lesson': return 'Lesson';
      default: return 'Resource';
    }
  };

  return (
    <Card 
      className="group cursor-pointer hover:border-primary/50 transition-all duration-200 hover:shadow-lg hover:shadow-primary/5"
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/20 text-primary">
              {getTypeIcon()}
            </div>
            <Badge variant="outline" className="bg-accent/30 text-accent-foreground border-accent/50">
              {getTypeLabel()}
            </Badge>
            <Badge variant="outline" className={getLevelColor(level)}>
              {level}
            </Badge>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onBookmark?.();
            }}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
          >
            <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
          </button>
        </div>
        
        <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
          {title}
        </h3>
        
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {description}
        </p>
        
        {progress > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        )}
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-3 border-t border-border">
          <Clock className="h-3 w-3" />
          {duration}
        </div>
      </CardContent>
    </Card>
  );
}
