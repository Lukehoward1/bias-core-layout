import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Clock, 
  BookOpen, 
  CheckCircle, 
  Circle, 
  Award, 
  X,
  Play,
  FileText,
  Video,
  GraduationCap
} from "lucide-react";

interface Lesson {
  id: string;
  title: string;
  duration: string;
  type: 'video' | 'text' | 'quiz';
}

interface CourseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: {
    id: string;
    title: string;
    description: string;
    duration: string;
    level: 'Beginner' | 'Intermediate' | 'Advanced';
    type: 'video' | 'pdf' | 'course' | 'lesson';
    lessons: Lesson[];
  };
  completedLessons: string[];
  isCompleted: boolean;
  onToggleLesson: (lessonId: string) => void;
  onViewCertificate: () => void;
}

export function CourseDetailModal({
  isOpen,
  onClose,
  course,
  completedLessons,
  isCompleted,
  onToggleLesson,
  onViewCertificate
}: CourseDetailModalProps) {
  const progressPercent = Math.round((completedLessons.length / course.lessons.length) * 100);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Beginner': return 'bg-success/20 text-success border-success/30';
      case 'Intermediate': return 'bg-warning/20 text-warning border-warning/30';
      case 'Advanced': return 'bg-destructive/20 text-destructive border-destructive/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTypeIcon = () => {
    switch (course.type) {
      case 'video': return <Video className="h-4 w-4" />;
      case 'pdf': return <FileText className="h-4 w-4" />;
      case 'course': return <GraduationCap className="h-4 w-4" />;
      case 'lesson': return <Play className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getLessonIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="h-4 w-4" />;
      case 'quiz': return <BookOpen className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto scrollbar-hidden p-0 gap-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card border-b border-border px-8 py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-primary/20 text-primary">
                  {getTypeIcon()}
                </div>
                <Badge variant="outline" className={getLevelColor(course.level)}>
                  {course.level}
                </Badge>
                {isCompleted && (
                  <Badge className="bg-success/20 text-success border-success/30">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Completed
                  </Badge>
                )}
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">{course.title}</h2>
              <p className="text-sm text-muted-foreground mb-4">{course.description}</p>
              
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {completedLessons.length} of {course.lessons.length} lessons completed
                  </span>
                  <span className="font-medium text-foreground">{progressPercent}%</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Duration & Certificate Button */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {course.duration}
              </span>
              <span className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                {course.lessons.length} lessons
              </span>
            </div>
            {isCompleted && (
              <Button onClick={onViewCertificate} variant="outline" className="gap-2">
                <Award className="h-4 w-4" />
                View Certificate
              </Button>
            )}
          </div>
        </div>

        {/* Lessons List */}
        <div className="p-8">
          <h3 className="text-lg font-semibold text-foreground mb-4">Course Content</h3>
          <div className="space-y-2">
            {course.lessons.map((lesson, index) => {
              const isLessonCompleted = completedLessons.includes(lesson.id);
              return (
                <button
                  key={lesson.id}
                  onClick={() => onToggleLesson(lesson.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-all text-left ${
                    isLessonCompleted 
                      ? 'bg-success/5 border-success/30 hover:bg-success/10' 
                      : 'bg-card border-border hover:border-primary/50 hover:bg-muted/30'
                  }`}
                >
                  <div className={`flex-shrink-0 ${isLessonCompleted ? 'text-success' : 'text-muted-foreground'}`}>
                    {isLessonCompleted ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <Circle className="h-5 w-5" />
                    )}
                  </div>
                  
                  <div className="flex-shrink-0 p-2 rounded-lg bg-muted/50">
                    {getLessonIcon(lesson.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Lesson {index + 1}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {lesson.type}
                      </Badge>
                    </div>
                    <h4 className={`font-medium ${isLessonCompleted ? 'text-success' : 'text-foreground'}`}>
                      {lesson.title}
                    </h4>
                  </div>
                  
                  <div className="flex-shrink-0 text-xs text-muted-foreground">
                    {lesson.duration}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Completion CTA */}
          {!isCompleted && completedLessons.length > 0 && (
            <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">
                Complete {course.lessons.length - completedLessons.length} more lesson{course.lessons.length - completedLessons.length !== 1 ? 's' : ''} to earn your certificate!
              </p>
            </div>
          )}

          {isCompleted && (
            <div className="mt-6 p-6 bg-success/5 border border-success/20 rounded-lg text-center">
              <Award className="h-10 w-10 text-success mx-auto mb-3" />
              <h4 className="font-semibold text-foreground mb-2">Congratulations!</h4>
              <p className="text-sm text-muted-foreground mb-4">
                You've completed this course. Claim your certificate to showcase your achievement.
              </p>
              <Button onClick={onViewCertificate} className="gap-2 bg-success hover:bg-success/90">
                <Award className="h-4 w-4" />
                Claim Certificate
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
