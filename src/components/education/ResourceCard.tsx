import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Bookmark, Play, FileText, Video, GraduationCap, CheckCircle, Award } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ResourceCardProps {
  title: string;
  description: string;
  duration: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  type: 'video' | 'pdf' | 'course' | 'lesson';
  progress?: number;
  isCompleted?: boolean;
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
  isCompleted = false,
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
      className={`group cursor-pointer transition-all duration-200 hover:shadow-lg ${
        isCompleted 
          ? 'border-success/50 hover:border-success bg-success/5 hover:shadow-success/5' 
          : 'hover:border-primary/50 hover:shadow-primary/5'
      }`}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className={`p-2 rounded-lg ${isCompleted ? 'bg-success/20 text-success' : 'bg-primary/20 text-primary'}`}>
              {isCompleted ? <CheckCircle className="h-4 w-4" /> : getTypeIcon()}
            </div>
            <Badge variant="outline" className="bg-accent/30 text-accent-foreground border-accent/50">
              {getTypeLabel()}
            </Badge>
            <Badge variant="outline" className={getLevelColor(level)}>
              {level}
            </Badge>
            {isCompleted && (
              <Badge className="bg-success/20 text-success border-success/30">
                <Award className="h-3 w-3 mr-1" />
                Completed
              </Badge>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onBookmark?.();
            }}
            className="p-1.5 rounded-md hover:bg-muted transition-colors flex-shrink-0"
          >
            <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
          </button>
        </div>
        
        <h3 className={`text-lg font-semibold mb-2 transition-colors line-clamp-2 ${
          isCompleted ? 'text-success group-hover:text-success' : 'text-foreground group-hover:text-primary'
        }`}>
          {title}
        </h3>
        
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {description}
        </p>
        
        {(progress > 0 || isCompleted) && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>Progress</span>
              <span className={isCompleted ? 'text-success font-medium' : ''}>{isCompleted ? 100 : progress}%</span>
            </div>
            <Progress value={isCompleted ? 100 : progress} className={`h-1.5 ${isCompleted ? '[&>div]:bg-success' : ''}`} />
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
