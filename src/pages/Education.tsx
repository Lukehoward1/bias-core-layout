import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CourseDetailModal } from "@/components/education/CourseDetailModal";
import { CertificateModal } from "@/components/education/CertificateModal";
import { useEducationProgress } from "@/hooks/use-education-progress";
import { generateCertificatePdf } from "@/lib/generateCertificatePdf";
import { toast } from "@/hooks/use-toast";
import {
  Clock,
  BookOpen,
  Award,
  FileText,
  Video,
  GraduationCap,
  Bookmark,
  Layers,
  Lightbulb,
  ArrowLeft,
  ChevronRight,
  Check,
} from "lucide-react";

// Types
interface Lesson {
  id: string;
  title: string;
  duration: string;
  type: 'video' | 'text' | 'quiz';
}

interface Course {
  id: string;
  title: string;
  description: string;
  duration: string;
  lessonsCount: number;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  format: 'Video' | 'Text' | 'Mixed';
  hasCertificate: boolean;
  progress: 'not-started' | 'in-progress' | 'completed';
  progressPercent: number;
  lessons: Lesson[];
}

interface QuickResource {
  id: string;
  title: string;
  description: string;
  readTime: string;
  tags: string[];
}

interface Certificate {
  id: string;
  courseName: string;
  completedDate: string;
}

// Demo data
const courses: Course[] = [
  {
    id: '1',
    title: 'Foundations of Forex',
    description: 'Master the fundamentals of currency trading from scratch.',
    duration: '4h 20m',
    lessonsCount: 8,
    level: 'Beginner',
    format: 'Video',
    hasCertificate: true,
    progress: 'in-progress',
    progressPercent: 45,
    lessons: [
      { id: '1-1', title: 'What is Forex?', duration: '12 min', type: 'video' },
      { id: '1-2', title: 'Currency Pairs Explained', duration: '18 min', type: 'video' },
      { id: '1-3', title: 'Reading Forex Quotes', duration: '15 min', type: 'video' },
      { id: '1-4', title: 'Market Sessions', duration: '20 min', type: 'video' },
      { id: '1-5', title: 'Pips and Lots', duration: '22 min', type: 'video' },
      { id: '1-6', title: 'Your First Trade', duration: '25 min', type: 'video' },
      { id: '1-7', title: 'Practice Exercises', duration: '30 min', type: 'text' },
      { id: '1-8', title: 'Module Quiz', duration: '15 min', type: 'quiz' },
    ]
  },
  {
    id: '2',
    title: 'Risk Management Mastery',
    description: 'Protect your capital with professional risk frameworks.',
    duration: '3h 45m',
    lessonsCount: 6,
    level: 'Intermediate',
    format: 'Mixed',
    hasCertificate: true,
    progress: 'in-progress',
    progressPercent: 20,
    lessons: [
      { id: '2-1', title: 'Why Risk Management Matters', duration: '15 min', type: 'video' },
      { id: '2-2', title: 'Position Sizing Formulas', duration: '25 min', type: 'video' },
      { id: '2-3', title: 'The 1% Rule', duration: '20 min', type: 'video' },
      { id: '2-4', title: 'Stop Loss Strategies', duration: '30 min', type: 'video' },
      { id: '2-5', title: 'Risk Calculator Worksheet', duration: '20 min', type: 'text' },
      { id: '2-6', title: 'Final Assessment', duration: '15 min', type: 'quiz' },
    ]
  },
  {
    id: '3',
    title: 'Trading Psychology Essentials',
    description: 'Build the mental edge that separates pros from amateurs.',
    duration: '2h 50m',
    lessonsCount: 5,
    level: 'Beginner',
    format: 'Video',
    hasCertificate: true,
    progress: 'not-started',
    progressPercent: 0,
    lessons: [
      { id: '3-1', title: "The Trader's Mindset", duration: '20 min', type: 'video' },
      { id: '3-2', title: 'Emotional Triggers', duration: '25 min', type: 'video' },
      { id: '3-3', title: 'Handling Losses', duration: '30 min', type: 'video' },
      { id: '3-4', title: 'Building Discipline', duration: '25 min', type: 'video' },
      { id: '3-5', title: 'Psychology Journal', duration: '20 min', type: 'text' },
    ]
  },
  {
    id: '4',
    title: 'Advanced Price Action',
    description: 'Read charts like a professional with advanced PA techniques.',
    duration: '5h 15m',
    lessonsCount: 10,
    level: 'Advanced',
    format: 'Video',
    hasCertificate: true,
    progress: 'completed',
    progressPercent: 100,
    lessons: [
      { id: '4-1', title: 'Market Structure Deep Dive', duration: '30 min', type: 'video' },
      { id: '4-2', title: 'Order Blocks', duration: '35 min', type: 'video' },
      { id: '4-3', title: 'Fair Value Gaps', duration: '30 min', type: 'video' },
      { id: '4-4', title: 'Liquidity Concepts', duration: '40 min', type: 'video' },
      { id: '4-5', title: 'Break of Structure', duration: '25 min', type: 'video' },
      { id: '4-6', title: 'Change of Character', duration: '25 min', type: 'video' },
      { id: '4-7', title: 'Entry Models', duration: '35 min', type: 'video' },
      { id: '4-8', title: 'Case Studies', duration: '40 min', type: 'video' },
      { id: '4-9', title: 'Practice Charts', duration: '30 min', type: 'text' },
      { id: '4-10', title: 'Certification Exam', duration: '20 min', type: 'quiz' },
    ]
  },
  {
    id: '5',
    title: 'Session Trading Strategies',
    description: 'Optimize your trading around London and New York sessions.',
    duration: '2h 30m',
    lessonsCount: 4,
    level: 'Intermediate',
    format: 'Mixed',
    hasCertificate: true,
    progress: 'completed',
    progressPercent: 100,
    lessons: [
      { id: '5-1', title: 'Understanding Sessions', duration: '25 min', type: 'video' },
      { id: '5-2', title: 'London Kill Zone', duration: '35 min', type: 'video' },
      { id: '5-3', title: 'NY Session Plays', duration: '35 min', type: 'video' },
      { id: '5-4', title: 'Session Quiz', duration: '15 min', type: 'quiz' },
    ]
  },
  {
    id: '6',
    title: 'Algorithmic Trading Basics',
    description: 'Introduction to building automated trading systems.',
    duration: '4h 00m',
    lessonsCount: 7,
    level: 'Advanced',
    format: 'Text',
    hasCertificate: true,
    progress: 'completed',
    progressPercent: 100,
    lessons: [
      { id: '6-1', title: 'What is Algo Trading?', duration: '20 min', type: 'text' },
      { id: '6-2', title: 'Strategy Logic', duration: '30 min', type: 'text' },
      { id: '6-3', title: 'Backtesting Fundamentals', duration: '40 min', type: 'video' },
      { id: '6-4', title: 'Avoiding Overfitting', duration: '30 min', type: 'text' },
      { id: '6-5', title: 'Paper Trading', duration: '25 min', type: 'video' },
      { id: '6-6', title: 'Going Live', duration: '30 min', type: 'text' },
      { id: '6-7', title: 'Final Test', duration: '15 min', type: 'quiz' },
    ]
  },
];

const articles: QuickResource[] = [
  { id: 'a1', title: 'Understanding Market Structure', description: 'The foundation of all technical analysis.', readTime: '6 min', tags: ['Technical', 'Beginner'] },
  { id: 'a2', title: 'The Psychology of Drawdowns', description: 'How to navigate losing streaks.', readTime: '8 min', tags: ['Psychology'] },
  { id: 'a3', title: 'Session Trading 101', description: 'Maximize the London-NY overlap.', readTime: '5 min', tags: ['Strategy'] },
  { id: 'a4', title: 'Order Flow Basics', description: 'Reading institutional footprints.', readTime: '10 min', tags: ['Advanced'] },
];

const tips: QuickResource[] = [
  { id: 't1', title: 'Always set your stop loss first', description: 'Define risk before profit.', readTime: '1 min', tags: ['Risk'] },
  { id: 't2', title: 'Wait for candle close', description: 'A wick can become a body.', readTime: '1 min', tags: ['Execution'] },
  { id: 't3', title: 'Trade the overlap', description: 'Best liquidity 8-12 EST.', readTime: '1 min', tags: ['Sessions'] },
  { id: 't4', title: 'Journal every trade', description: 'Review to improve.', readTime: '1 min', tags: ['Psychology'] },
];

const demoCertificates: Certificate[] = [
  { id: 'c1', courseName: 'Advanced Price Action', completedDate: 'Nov 28, 2024' },
  { id: 'c2', courseName: 'Session Trading Strategies', completedDate: 'Nov 15, 2024' },
  { id: 'c3', courseName: 'Algorithmic Trading Basics', completedDate: 'Oct 22, 2024' },
];

type ViewMode = 'landing' | 'courses' | 'articles' | 'tips';

export default function Education() {
  const [viewMode, setViewMode] = useState<ViewMode>('landing');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [certificateCourse, setCertificateCourse] = useState<Course | null>(null);

  const { 
    getCourseProgress, 
    requestCertificate,
    issueCertificate
  } = useEducationProgress();

  const studentName = "John Doe";

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Beginner': return 'bg-success/20 text-success border-success/30';
      case 'Intermediate': return 'bg-warning/20 text-warning border-warning/30';
      case 'Advanced': return 'bg-destructive/20 text-destructive border-destructive/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'Video': return <Video className="h-3 w-3" />;
      case 'Text': return <FileText className="h-3 w-3" />;
      case 'Mixed': return <Layers className="h-3 w-3" />;
      default: return <BookOpen className="h-3 w-3" />;
    }
  };

  const handleCourseClick = (course: Course) => {
    setSelectedCourse(course);
  };

  const handleViewCertificate = () => {
    if (selectedCourse) {
      setCertificateCourse(selectedCourse);
      setShowCertificateModal(true);
      setSelectedCourse(null);
    }
  };

  const handleRequestCertificate = () => {
    if (certificateCourse) {
      requestCertificate(certificateCourse.id);
      toast({
        title: "Certificate Requested",
        description: "Your certificate request has been submitted."
      });
    }
  };

  const handleGeneratePdf = async () => {
    if (certificateCourse) {
      const courseProgress = getCourseProgress(certificateCourse.id);
      try {
        await generateCertificatePdf({
          studentName,
          courseName: certificateCourse.title,
          completedAt: courseProgress?.completedAt || new Date().toISOString()
        });
        issueCertificate(certificateCourse.id);
        toast({
          title: "Certificate Downloaded",
          description: "Your certificate PDF has been generated."
        });
      } catch {
        toast({
          title: "Error",
          description: "Failed to generate certificate.",
          variant: "destructive"
        });
      }
    }
  };

  const getCompletedLessonsForCourse = (courseId: string) => {
    const courseProgress = getCourseProgress(courseId);
    return courseProgress?.completedLessons || [];
  };

  // Landing Page View
  if (viewMode === 'landing') {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <AppHeader title="Education" />
        
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Page Header - Centered */}
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-16 pt-4 sm:pt-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">Education</h1>
            <p className="text-muted-foreground text-base sm:text-lg">
              Curated training for serious traders – strategies, risk, and psychology.
            </p>
          </div>

          {/* Category Cards Grid */}
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {/* Courses */}
            <Card 
              className="bg-card border-border hover:border-primary/50 transition-all duration-200 cursor-pointer group"
              onClick={() => setViewMode('courses')}
            >
              <CardContent className="p-6 sm:p-8 flex flex-col items-center text-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-primary/20 group-hover:scale-105 transition-all">
                  <GraduationCap className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
                </div>
                <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-2">Courses</h2>
                <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6 leading-relaxed">
                  Full learning programs with tracked progress and certificates.
                </p>
                <Button className="w-full group-hover:bg-primary/90 text-sm">
                  Browse Courses
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </CardContent>
            </Card>

            {/* Articles & Guides */}
            <Card 
              className="bg-card border-border hover:border-primary/50 transition-all duration-200 cursor-pointer group"
              onClick={() => setViewMode('articles')}
            >
              <CardContent className="p-6 sm:p-8 flex flex-col items-center text-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-primary/20 group-hover:scale-105 transition-all">
                  <FileText className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
                </div>
                <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-2">Articles & Guides</h2>
                <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6 leading-relaxed">
                  Short-form breakdowns of market concepts, psychology and strategies.
                </p>
                <Button className="w-full group-hover:bg-primary/90 text-sm">
                  Browse Articles
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </CardContent>
            </Card>

            {/* Trading Tips */}
            <Card 
              className="bg-card border-border hover:border-primary/50 transition-all duration-200 cursor-pointer group"
              onClick={() => setViewMode('tips')}
            >
              <CardContent className="p-6 sm:p-8 flex flex-col items-center text-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-primary/20 group-hover:scale-105 transition-all">
                  <Lightbulb className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
                </div>
                <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-2">Trading Tips</h2>
                <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6 leading-relaxed">
                  Quick execution and improvement techniques for serious traders.
                </p>
                <Button className="w-full group-hover:bg-primary/90 text-sm">
                  Browse Tips
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Courses View - 2-column grid matching Articles & Guides style
  if (viewMode === 'courses') {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <AppHeader title="Education" />
        
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Back Button & Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setViewMode('landing')}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">Structured Courses</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Deep-dive programs with progress tracking & certificates.
                </p>
              </div>
            </div>
          </div>

          {/* Courses Grid - 2 columns on desktop, 1 on mobile */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courses.map((course) => (
              <Card 
                key={course.id} 
                className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer group flex flex-col"
                onClick={() => handleCourseClick(course)}
              >
                <CardContent className="p-4 flex flex-col flex-1">
                  {/* Title */}
                  <h3 className="font-medium text-foreground group-hover:text-primary transition-colors mb-1 text-sm sm:text-base">
                    {course.title}
                  </h3>
                  {/* Subtitle */}
                  <p className="text-xs sm:text-sm text-muted-foreground mb-3 line-clamp-2">
                    {course.description}
                  </p>
                  
                  {/* Pill row: Level, Format, Duration, Lessons, Certificate */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className={`text-[10px] ${getLevelColor(course.level)}`}>
                      {course.level}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] gap-1">
                      {getFormatIcon(course.format)}
                      {course.format}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] gap-1">
                      <Clock className="h-3 w-3" />
                      {course.duration}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] gap-1">
                      <BookOpen className="h-3 w-3" />
                      {course.lessonsCount} lessons
                    </Badge>
                    {course.hasCertificate && (
                      <Badge variant="secondary" className="text-[10px] gap-1 text-primary border-primary/30">
                        <Award className="h-3 w-3" />
                        Certificate
                      </Badge>
                    )}
                  </div>

                  {/* Spacer */}
                  <div className="flex-1" />

                  {/* Progress area - only shown if course has been started */}
                  {course.progressPercent > 0 && (
                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/50">
                      <div className="flex items-center gap-2 flex-1 mr-3">
                        <span className={`text-[10px] sm:text-xs flex items-center gap-1 ${
                          course.progressPercent === 100 ? 'text-success' : 'text-muted-foreground'
                        }`}>
                          {course.progressPercent === 100 && <Check className="h-3 w-3" />}
                          {course.progressPercent === 100 ? 'Completed' : `In progress – ${course.progressPercent}%`}
                        </span>
                        <Progress 
                          value={course.progressPercent} 
                          className="h-1 flex-1 max-w-24"
                        />
                      </div>
                      <Button 
                        size="sm" 
                        className="text-xs h-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCourseClick(course);
                        }}
                      >
                        {course.progressPercent === 100 ? 'Review' : 'Continue'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Certificates Section - Subtle at bottom */}
          {demoCertificates.length > 0 && (
            <div className="mt-8 pt-6 border-t border-border/50">
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Award className="h-4 w-4" />
                Your Certificates
              </h3>
              <div className="flex flex-wrap gap-3">
                {demoCertificates.map((cert) => (
                  <div 
                    key={cert.id}
                    className="flex items-center gap-3 px-3 py-2 bg-card/50 border border-border/50 rounded-lg"
                  >
                    <Award className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-foreground">{cert.courseName}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">{cert.completedDate}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs h-7">
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Course Detail Modal */}
        <CourseDetailModal
          isOpen={!!selectedCourse}
          onClose={() => setSelectedCourse(null)}
          course={selectedCourse ? {
            ...selectedCourse,
            type: 'course' as const
          } : { id: '', title: '', description: '', duration: '', level: 'Beginner' as const, type: 'course' as const, lessons: [] }}
          completedLessons={selectedCourse ? getCompletedLessonsForCourse(selectedCourse.id) : []}
          isCompleted={selectedCourse?.progress === 'completed'}
          onToggleLesson={() => {}}
          onViewCertificate={handleViewCertificate}
        />

        {/* Certificate Modal */}
        <CertificateModal
          isOpen={showCertificateModal && !!certificateCourse}
          onClose={() => {
            setShowCertificateModal(false);
            setCertificateCourse(null);
          }}
          courseName={certificateCourse?.title || ''}
          studentName={studentName}
          completedAt={certificateCourse ? (getCourseProgress(certificateCourse.id)?.completedAt || new Date().toISOString()) : new Date().toISOString()}
          certificateRequested={certificateCourse ? (getCourseProgress(certificateCourse.id)?.certificateRequested || false) : false}
          certificateIssued={certificateCourse ? (getCourseProgress(certificateCourse.id)?.certificateIssued || false) : false}
          onRequestCertificate={handleRequestCertificate}
          onGeneratePdf={handleGeneratePdf}
        />
      </div>
    );
  }

  // Articles View - 2-column grid matching Courses style
  if (viewMode === 'articles') {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <AppHeader title="Education" />
        
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Back Button & Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setViewMode('landing')}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Articles & Guides</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Short-form breakdowns of market concepts, psychology and platform usage.
              </p>
            </div>
          </div>

          {/* Articles Grid - 2 columns on desktop, 1 on mobile */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {articles.map((article) => (
              <Card 
                key={article.id}
                className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer group flex flex-col"
              >
                <CardContent className="p-4 flex flex-col flex-1">
                  {/* Title */}
                  <h3 className="font-medium text-foreground group-hover:text-primary transition-colors mb-1 text-sm sm:text-base">
                    {article.title}
                  </h3>
                  {/* Subtitle */}
                  <p className="text-xs sm:text-sm text-muted-foreground mb-3 line-clamp-2">
                    {article.description}
                  </p>
                  
                  {/* Spacer */}
                  <div className="flex-1" />

                  {/* Meta row with bookmark */}
                  <div className="flex items-center justify-between pt-3 border-t border-border/50">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] gap-1">
                        <Clock className="h-3 w-3" />
                        {article.readTime} read
                      </Badge>
                      {article.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[10px]">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary">
                      <Bookmark className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Tips View - 2-column grid matching Courses & Articles style
  if (viewMode === 'tips') {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <AppHeader title="Education" />
        
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Back Button & Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setViewMode('landing')}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Trading Tips</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Execution and improvement techniques for serious traders.
              </p>
            </div>
          </div>

          {/* Tips Grid - 2 columns on desktop, 1 on mobile */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tips.map((tip) => (
              <Card 
                key={tip.id}
                className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer group flex flex-col"
              >
                <CardContent className="p-4 flex flex-col flex-1">
                  {/* Title */}
                  <h3 className="font-medium text-foreground group-hover:text-primary transition-colors mb-1 text-sm sm:text-base">
                    {tip.title}
                  </h3>
                  {/* Subtitle */}
                  <p className="text-xs sm:text-sm text-muted-foreground mb-3 line-clamp-2">
                    {tip.description}
                  </p>
                  
                  {/* Spacer */}
                  <div className="flex-1" />

                  {/* Meta row */}
                  <div className="flex items-center gap-2 pt-3 border-t border-border/50">
                    {tip.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[10px]">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
