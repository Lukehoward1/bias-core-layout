import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CourseDetailModal } from "@/components/education/CourseDetailModal";
import { CertificateModal } from "@/components/education/CertificateModal";
import { EducationContentModal } from "@/components/education/EducationContentModal";
import { useEducationProgress } from "@/hooks/use-education-progress";
import { generateCertificatePdf } from "@/lib/generateCertificatePdf";
import { toast } from "@/hooks/use-toast";
import { articles, tips } from "@/data/educationContent";
import {
  Clock,
  BookOpen,
  Award,
  FileText,
  Video,
  Bookmark,
  Layers,
  Check,
} from "lucide-react";

// Set to true to re-enable the Courses section (wire ?view=courses in the sidebar)
const SHOW_COURSES = false;

// Types
interface Lesson {
  id: string;
  title: string;
  duration: string;
  type: "video" | "text" | "quiz";
}

interface Course {
  id: string;
  title: string;
  description: string;
  duration: string;
  lessonsCount: number;
  level: "Beginner" | "Intermediate" | "Advanced";
  format: "Video" | "Text" | "Mixed";
  hasCertificate: boolean;
  progress: "not-started" | "in-progress" | "completed";
  progressPercent: number;
  lessons: Lesson[];
}

interface Certificate {
  id: string;
  courseName: string;
  completedDate: string;
}

type ContentModalPayload = {
  title: string;
  type: "article" | "tip" | "resource";
  level?: "Beginner" | "Intermediate" | "Advanced";
  readTime?: string;
  tags?: string[];
  content: string;
};

// Course data — kept for when SHOW_COURSES is re-enabled
const courses: Course[] = [
  {
    id: "1",
    title: "Foundations of Forex",
    description: "Master the fundamentals of currency trading from scratch.",
    duration: "4h 20m",
    lessonsCount: 8,
    level: "Beginner",
    format: "Video",
    hasCertificate: true,
    progress: "in-progress",
    progressPercent: 45,
    lessons: [
      { id: "1-1", title: "What is Forex?", duration: "12 min", type: "video" },
      { id: "1-2", title: "Currency Pairs Explained", duration: "18 min", type: "video" },
      { id: "1-3", title: "Reading Forex Quotes", duration: "15 min", type: "video" },
      { id: "1-4", title: "Market Sessions", duration: "20 min", type: "video" },
      { id: "1-5", title: "Pips and Lots", duration: "22 min", type: "video" },
      { id: "1-6", title: "Your First Trade", duration: "25 min", type: "video" },
      { id: "1-7", title: "Practice Exercises", duration: "30 min", type: "text" },
      { id: "1-8", title: "Module Quiz", duration: "15 min", type: "quiz" },
    ],
  },
  {
    id: "2",
    title: "Risk Management Mastery",
    description: "Protect your capital with professional risk frameworks.",
    duration: "3h 45m",
    lessonsCount: 6,
    level: "Intermediate",
    format: "Mixed",
    hasCertificate: true,
    progress: "in-progress",
    progressPercent: 20,
    lessons: [
      { id: "2-1", title: "Why Risk Management Matters", duration: "15 min", type: "video" },
      { id: "2-2", title: "Position Sizing Formulas", duration: "25 min", type: "video" },
      { id: "2-3", title: "The 1% Rule", duration: "20 min", type: "video" },
      { id: "2-4", title: "Stop Loss Strategies", duration: "30 min", type: "video" },
      { id: "2-5", title: "Risk Calculator Worksheet", duration: "20 min", type: "text" },
      { id: "2-6", title: "Final Assessment", duration: "15 min", type: "quiz" },
    ],
  },
  {
    id: "3",
    title: "Trading Psychology Essentials",
    description: "Build the mental edge that separates pros from amateurs.",
    duration: "2h 50m",
    lessonsCount: 5,
    level: "Beginner",
    format: "Video",
    hasCertificate: true,
    progress: "not-started",
    progressPercent: 0,
    lessons: [
      { id: "3-1", title: "The Trader's Mindset", duration: "20 min", type: "video" },
      { id: "3-2", title: "Emotional Triggers", duration: "25 min", type: "video" },
      { id: "3-3", title: "Handling Losses", duration: "30 min", type: "video" },
      { id: "3-4", title: "Building Discipline", duration: "25 min", type: "video" },
      { id: "3-5", title: "Psychology Journal", duration: "20 min", type: "text" },
    ],
  },
  {
    id: "4",
    title: "Advanced Price Action",
    description: "Read charts like a professional with advanced PA techniques.",
    duration: "5h 15m",
    lessonsCount: 10,
    level: "Advanced",
    format: "Video",
    hasCertificate: true,
    progress: "completed",
    progressPercent: 100,
    lessons: [
      { id: "4-1", title: "Market Structure Deep Dive", duration: "30 min", type: "video" },
      { id: "4-2", title: "Order Blocks", duration: "35 min", type: "video" },
      { id: "4-3", title: "Fair Value Gaps", duration: "30 min", type: "video" },
      { id: "4-4", title: "Liquidity Concepts", duration: "40 min", type: "video" },
      { id: "4-5", title: "Break of Structure", duration: "25 min", type: "video" },
      { id: "4-6", title: "Change of Character", duration: "25 min", type: "video" },
      { id: "4-7", title: "Entry Models", duration: "35 min", type: "video" },
      { id: "4-8", title: "Case Studies", duration: "40 min", type: "video" },
      { id: "4-9", title: "Practice Charts", duration: "30 min", type: "text" },
      { id: "4-10", title: "Certification Exam", duration: "20 min", type: "quiz" },
    ],
  },
  {
    id: "5",
    title: "Session Trading Strategies",
    description: "Optimize your trading around London and New York sessions.",
    duration: "2h 30m",
    lessonsCount: 4,
    level: "Intermediate",
    format: "Mixed",
    hasCertificate: true,
    progress: "completed",
    progressPercent: 100,
    lessons: [
      { id: "5-1", title: "Understanding Sessions", duration: "25 min", type: "video" },
      { id: "5-2", title: "London Kill Zone", duration: "35 min", type: "video" },
      { id: "5-3", title: "NY Session Plays", duration: "35 min", type: "video" },
      { id: "5-4", title: "Session Quiz", duration: "15 min", type: "quiz" },
    ],
  },
  {
    id: "6",
    title: "Algorithmic Trading Basics",
    description: "Introduction to building automated trading systems.",
    duration: "4h 00m",
    lessonsCount: 7,
    level: "Advanced",
    format: "Text",
    hasCertificate: true,
    progress: "completed",
    progressPercent: 100,
    lessons: [
      { id: "6-1", title: "What is Algo Trading?", duration: "20 min", type: "text" },
      { id: "6-2", title: "Strategy Logic", duration: "30 min", type: "text" },
      { id: "6-3", title: "Backtesting Fundamentals", duration: "40 min", type: "video" },
      { id: "6-4", title: "Avoiding Overfitting", duration: "30 min", type: "text" },
      { id: "6-5", title: "Paper Trading", duration: "25 min", type: "video" },
      { id: "6-6", title: "Going Live", duration: "30 min", type: "text" },
      { id: "6-7", title: "Final Test", duration: "15 min", type: "quiz" },
    ],
  },
];

const demoCertificates: Certificate[] = [
  { id: "c1", courseName: "Advanced Price Action", completedDate: "Nov 28, 2024" },
  { id: "c2", courseName: "Session Trading Strategies", completedDate: "Nov 15, 2024" },
  { id: "c3", courseName: "Algorithmic Trading Basics", completedDate: "Oct 22, 2024" },
];

export default function Education() {
  const [searchParams] = useSearchParams();
  const showTips = searchParams.get("view") === "tips";

  const [selectedContent, setSelectedContent] = useState<ContentModalPayload | null>(null);

  // Course-related state — kept for when SHOW_COURSES is re-enabled
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [certificateCourse, setCertificateCourse] = useState<Course | null>(null);

  const { getCourseProgress, requestCertificate, issueCertificate } = useEducationProgress();
  const studentName = "John Doe";

  const getLevelColor = (level: string) => {
    switch (level) {
      case "Beginner":
        return "bg-success/20 text-success border-success/30";
      case "Intermediate":
        return "bg-warning/20 text-warning border-warning/30";
      case "Advanced":
        return "bg-destructive/20 text-destructive border-destructive/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case "Video":
        return <Video className="h-3 w-3" />;
      case "Text":
        return <FileText className="h-3 w-3" />;
      case "Mixed":
        return <Layers className="h-3 w-3" />;
      default:
        return <BookOpen className="h-3 w-3" />;
    }
  };

  // Course handlers — kept for when SHOW_COURSES is re-enabled
  const handleCourseClick = (course: Course) => setSelectedCourse(course);

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
      toast({ title: "Certificate Requested", description: "Your certificate request has been submitted." });
    }
  };

  const handleGeneratePdf = async () => {
    if (certificateCourse) {
      const courseProgress = getCourseProgress(certificateCourse.id);
      try {
        await generateCertificatePdf({
          studentName,
          courseName: certificateCourse.title,
          completedAt: courseProgress?.completedAt || new Date().toISOString(),
        });
        issueCertificate(certificateCourse.id);
        toast({ title: "Certificate Downloaded", description: "Your certificate PDF has been generated." });
      } catch {
        toast({ title: "Error", description: "Failed to generate certificate.", variant: "destructive" });
      }
    }
  };

  const getCompletedLessonsForCourse = (courseId: string) => {
    return getCourseProgress(courseId)?.completedLessons || [];
  };

  // ── Trading Tips view ────────────────────────────────────────────────────────
  if (showTips) {
    return (
      <div className="flex-1 overflow-y-auto bg-background">
        <div className="flex flex-col min-h-0">
          <AppHeader title="Trading Tips" />

          <div className="p-4 sm:p-6">
            <div className="mb-6">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Trading Tips</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Quick execution and improvement techniques for serious traders.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tips.map((tip) => (
                <Card
                  key={tip.id}
                  className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer group flex flex-col"
                  onClick={() =>
                    setSelectedContent({
                      title: tip.title,
                      type: "tip",
                      level: "Beginner",
                      readTime: tip.readTime,
                      tags: tip.tags,
                      content: tip.content,
                    })
                  }
                >
                  <CardContent className="p-4 flex flex-col flex-1">
                    <h3 className="font-medium text-foreground group-hover:text-primary transition-colors mb-1 text-sm sm:text-base">
                      {tip.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-3 line-clamp-2">{tip.description}</p>

                    <div className="flex-1" />

                    <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-border/50">
                      <Badge variant="secondary" className="text-[10px] gap-1">
                        <Clock className="h-3 w-3" />
                        {tip.readTime} read
                      </Badge>
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

        <EducationContentModal
          isOpen={!!selectedContent}
          onClose={() => setSelectedContent(null)}
          content={selectedContent}
        />
      </div>
    );
  }

  // ── Guides view (default) ────────────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="flex flex-col min-h-0">
        <AppHeader title="Guides" />

        <div className="p-4 sm:p-6">
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Guides</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Short-form breakdowns of market concepts, psychology and platform usage.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {articles.map((article) => (
              <Card
                key={article.id}
                className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer group flex flex-col"
                onClick={() =>
                  setSelectedContent({
                    title: article.title,
                    type: "article",
                    level: article.level,
                    readTime: article.readTime,
                    tags: article.tags,
                    content: article.content,
                  })
                }
              >
                <CardContent className="p-4 flex flex-col flex-1">
                  <h3 className="font-medium text-foreground group-hover:text-primary transition-colors mb-1 text-sm sm:text-base">
                    {article.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-3 line-clamp-2">{article.description}</p>

                  <div className="flex-1" />

                  <div className="flex items-center justify-between pt-3 border-t border-border/50">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className={`text-[10px] ${getLevelColor(article.level)}`}>
                        {article.level}
                      </Badge>
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-primary shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Bookmark className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <EducationContentModal
        isOpen={!!selectedContent}
        onClose={() => setSelectedContent(null)}
        content={selectedContent}
      />

      {/* Course modals — kept for when SHOW_COURSES is re-enabled */}
      {SHOW_COURSES && (
        <>
          <CourseDetailModal
            isOpen={!!selectedCourse}
            onClose={() => setSelectedCourse(null)}
            course={
              selectedCourse
                ? { ...selectedCourse, type: "course" as const }
                : { id: "", title: "", description: "", duration: "", level: "Beginner" as const, type: "course" as const, lessons: [] }
            }
            completedLessons={selectedCourse ? getCompletedLessonsForCourse(selectedCourse.id) : []}
            isCompleted={selectedCourse?.progress === "completed"}
            onToggleLesson={() => {}}
            onViewCertificate={handleViewCertificate}
          />
          <CertificateModal
            isOpen={showCertificateModal && !!certificateCourse}
            onClose={() => { setShowCertificateModal(false); setCertificateCourse(null); }}
            courseName={certificateCourse?.title || ""}
            studentName={studentName}
            completedAt={
              certificateCourse
                ? getCourseProgress(certificateCourse.id)?.completedAt || new Date().toISOString()
                : new Date().toISOString()
            }
            certificateRequested={certificateCourse ? getCourseProgress(certificateCourse.id)?.certificateRequested || false : false}
            certificateIssued={certificateCourse ? getCourseProgress(certificateCourse.id)?.certificateIssued || false : false}
            onRequestCertificate={handleRequestCertificate}
            onGeneratePdf={handleGeneratePdf}
          />
        </>
      )}

      {/* Suppress unused-variable warnings for course data kept for future re-enable */}
      {SHOW_COURSES && courses.length > 0 && demoCertificates.length > 0 && (
        courses.map(c => (
          <button key={c.id} type="button" style={{ display: 'none' }} onClick={() => handleCourseClick(c)} />
        ))
      )}
    </div>
  );
}
