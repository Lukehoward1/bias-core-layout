import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CourseDetailModal } from "@/components/education/CourseDetailModal";
import { CertificateModal } from "@/components/education/CertificateModal";
import { useEducationProgress } from "@/hooks/use-education-progress";
import { generateCertificatePdf } from "@/lib/generateCertificatePdf";
import { toast } from "@/hooks/use-toast";
import {
  Clock,
  BookOpen,
  Award,
  Play,
  FileText,
  Video,
  GraduationCap,
  Bookmark,
  CheckCircle,
  Layers,
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

// Demo progress stats
const coursesInProgress = courses.filter(c => c.progress === 'in-progress').length;
const coursesCompleted = courses.filter(c => c.progress === 'completed').length;
const totalCourses = courses.length;
const overallProgress = Math.round((coursesCompleted / totalCourses) * 100);

export default function Education() {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [certificateCourse, setCertificateCourse] = useState<Course | null>(null);
  const [activeFilters, setActiveFilters] = useState<{ levels: string[]; topics: string[] }>({
    levels: [],
    topics: []
  });

  const { 
    progress, 
    toggleLessonComplete, 
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

  const getProgressText = (progress: string) => {
    switch (progress) {
      case 'completed': return 'Completed';
      case 'in-progress': return 'In Progress';
      default: return 'Not Started';
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

  const toggleFilter = (type: 'levels' | 'topics', value: string) => {
    setActiveFilters(prev => ({
      ...prev,
      [type]: prev[type].includes(value)
        ? prev[type].filter(v => v !== value)
        : [...prev[type], value]
    }));
  };

  // Get completed lessons for current course from progress hook
  const getCompletedLessonsForCourse = (courseId: string) => {
    const courseProgress = getCourseProgress(courseId);
    return courseProgress?.completedLessons || [];
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <AppHeader title="Education" />
      
      <div className="flex-1 overflow-y-auto p-6">
        {/* Page Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Education</h1>
            <p className="text-muted-foreground mt-1">
              Curated training for serious traders – strategies, risk, and psychology.
            </p>
          </div>
          
          {/* Learning Snapshot Pill */}
          <div className="flex items-center gap-4 px-4 py-3 bg-card border border-border rounded-xl">
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">{coursesInProgress}</div>
              <div className="text-xs text-muted-foreground">In Progress</div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <div className="text-lg font-bold text-success">{coursesCompleted}</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="relative w-12 h-12">
              <svg className="w-12 h-12 -rotate-90">
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  className="text-muted/30"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeDasharray={`${overallProgress * 1.256} 125.6`}
                  className="text-primary"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground">
                {overallProgress}%
              </span>
            </div>
          </div>
        </div>

        {/* Main 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
          {/* Left Column - Main Content */}
          <div className="space-y-6">
            {/* Structured Courses Section */}
            <section>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  Structured Courses
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Deep-dive programs with progress tracking & certificates.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {courses.map((course) => (
                  <Card 
                    key={course.id} 
                    className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer group"
                    onClick={() => handleCourseClick(course)}
                  >
                    <CardContent className="p-5">
                      {/* Title & Description */}
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors mb-1">
                        {course.title}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {course.description}
                      </p>
                      
                      {/* Badges Row */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-3">
                        <Badge variant="outline" className={`text-[10px] ${getLevelColor(course.level)}`}>
                          {course.level}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] gap-1">
                          {getFormatIcon(course.format)}
                          {course.format}
                        </Badge>
                      </div>
                      
                      {/* Meta Row */}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {course.duration}
                        </span>
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          {course.lessonsCount} lessons
                        </span>
                        {course.hasCertificate && (
                          <span className="flex items-center gap-1 text-primary">
                            <Award className="h-3 w-3" />
                            Certificate
                          </span>
                        )}
                      </div>
                      
                      {/* Progress */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between text-xs">
                          <span className={`font-medium ${
                            course.progress === 'completed' ? 'text-success' :
                            course.progress === 'in-progress' ? 'text-warning' :
                            'text-muted-foreground'
                          }`}>
                            {getProgressText(course.progress)}
                          </span>
                          <span className="text-muted-foreground">{course.progressPercent}%</span>
                        </div>
                        <Progress value={course.progressPercent} className="h-1.5" />
                      </div>
                      
                      {/* CTA Button */}
                      <Button 
                        className="w-full" 
                        size="sm"
                        variant={course.progress === 'completed' ? 'outline' : 'default'}
                      >
                        {course.progress === 'completed' ? (
                          <>
                            <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                            View Course
                          </>
                        ) : course.progress === 'in-progress' ? (
                          <>
                            <Play className="h-3.5 w-3.5 mr-1.5" />
                            Continue
                          </>
                        ) : (
                          <>
                            <Play className="h-3.5 w-3.5 mr-1.5" />
                            Start Course
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Quick Resources Section */}
            <section>
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    Quick Resources
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="articles" className="w-full">
                    <TabsList className="mb-4 bg-muted/50">
                      <TabsTrigger value="articles">Articles & Guides</TabsTrigger>
                      <TabsTrigger value="tips">Trading Tips</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="articles" className="space-y-2 mt-0">
                      {articles.map((article) => (
                        <div
                          key={article.id}
                          className="flex items-start justify-between gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer group"
                        >
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
                              {article.title}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-0.5">{article.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs text-muted-foreground">{article.readTime}</span>
                              {article.tags.map(tag => (
                                <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                              ))}
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="flex-shrink-0 h-8 w-8 text-muted-foreground hover:text-primary">
                            <Bookmark className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </TabsContent>
                    
                    <TabsContent value="tips" className="space-y-2 mt-0">
                      {tips.map((tip) => (
                        <div
                          key={tip.id}
                          className="flex items-start justify-between gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer group"
                        >
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
                              {tip.title}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-0.5">{tip.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs text-muted-foreground">{tip.readTime}</span>
                              {tip.tags.map(tag => (
                                <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                              ))}
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="flex-shrink-0 h-8 w-8 text-muted-foreground hover:text-primary">
                            <Bookmark className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </section>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-4">
            {/* Learning Path Card */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground font-medium">Learning Path</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">Next up for you:</p>
                
                {/* Recommended Course */}
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/20 text-primary">
                      <GraduationCap className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm text-foreground">Trading Psychology Essentials</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">2h 50m • 5 lessons</p>
                    </div>
                  </div>
                  <Button size="sm" className="w-full mt-3">
                    <Play className="h-3 w-3 mr-1" />
                    Start
                  </Button>
                </div>
                
                {/* Recommended Resource */}
                <div className="p-3 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm text-foreground">Order Flow Basics</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">10 min read</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="w-full mt-3">
                    Open
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Filters Card */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground font-medium">Filters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Level Filters */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Level</p>
                  <div className="flex flex-wrap gap-1.5">
                    {['Beginner', 'Intermediate', 'Advanced'].map((level) => (
                      <Badge
                        key={level}
                        variant={activeFilters.levels.includes(level) ? 'default' : 'secondary'}
                        className="cursor-pointer text-xs"
                        onClick={() => toggleFilter('levels', level)}
                      >
                        {level}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                {/* Topic Filters */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Topics</p>
                  <div className="flex flex-wrap gap-1.5">
                    {['Strategy', 'Risk', 'Psychology', 'Platform'].map((topic) => (
                      <Badge
                        key={topic}
                        variant={activeFilters.topics.includes(topic) ? 'default' : 'secondary'}
                        className="cursor-pointer text-xs"
                        onClick={() => toggleFilter('topics', topic)}
                      >
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Certificates Card */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                  <Award className="h-4 w-4 text-primary" />
                  Certificates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {demoCertificates.map((cert) => (
                  <div key={cert.id} className="flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/30">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-medium text-foreground truncate">{cert.courseName}</h4>
                      <p className="text-xs text-muted-foreground">{cert.completedDate}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="flex-shrink-0 text-xs">
                      <FileText className="h-3 w-3 mr-1" />
                      PDF
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Course Detail Modal */}
      {selectedCourse && (
        <CourseDetailModal
          isOpen={!!selectedCourse}
          onClose={() => setSelectedCourse(null)}
          course={{
            id: selectedCourse.id,
            title: selectedCourse.title,
            description: selectedCourse.description,
            duration: selectedCourse.duration,
            level: selectedCourse.level,
            type: 'course',
            lessons: selectedCourse.lessons
          }}
          completedLessons={getCompletedLessonsForCourse(selectedCourse.id)}
          isCompleted={selectedCourse.progress === 'completed'}
          onToggleLesson={(lessonId) => toggleLessonComplete(selectedCourse.id, lessonId, selectedCourse.lessons.length)}
          onViewCertificate={handleViewCertificate}
        />
      )}

      {/* Certificate Modal */}
      {certificateCourse && (
        <CertificateModal
          isOpen={showCertificateModal}
          onClose={() => {
            setShowCertificateModal(false);
            setCertificateCourse(null);
          }}
          courseName={certificateCourse.title}
          studentName={studentName}
          completedAt={getCourseProgress(certificateCourse.id)?.completedAt || new Date().toISOString()}
          certificateRequested={getCourseProgress(certificateCourse.id)?.certificateRequested || false}
          certificateIssued={getCourseProgress(certificateCourse.id)?.certificateIssued || false}
          onRequestCertificate={handleRequestCertificate}
          onGeneratePdf={handleGeneratePdf}
        />
      )}
    </div>
  );
}