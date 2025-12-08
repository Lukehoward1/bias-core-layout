import { useState, useEffect, useCallback } from 'react';

interface CourseProgress {
  courseId: string;
  completedLessons: string[];
  totalLessons: number;
  isCompleted: boolean;
  completedAt?: string;
  certificateRequested: boolean;
  certificateRequestedAt?: string;
  certificateIssued: boolean;
  certificateIssuedAt?: string;
}

interface EducationProgress {
  courses: Record<string, CourseProgress>;
  completedArticles: string[];
  completedTips: string[];
}

const STORAGE_KEY = 'streambias-education-progress';

const getInitialProgress = (): EducationProgress => {
  if (typeof window === 'undefined') return { courses: {}, completedArticles: [], completedTips: [] };
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return { courses: {}, completedArticles: [], completedTips: [] };
    }
  }
  return { courses: {}, completedArticles: [], completedTips: [] };
};

export function useEducationProgress() {
  const [progress, setProgress] = useState<EducationProgress>(getInitialProgress);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  const initializeCourse = useCallback((courseId: string, totalLessons: number) => {
    setProgress(prev => {
      if (prev.courses[courseId]) return prev;
      return {
        ...prev,
        courses: {
          ...prev.courses,
          [courseId]: {
            courseId,
            completedLessons: [],
            totalLessons,
            isCompleted: false,
            certificateRequested: false,
            certificateIssued: false
          }
        }
      };
    });
  }, []);

  const toggleLessonComplete = useCallback((courseId: string, lessonId: string, totalLessons: number) => {
    setProgress(prev => {
      const course = prev.courses[courseId] || {
        courseId,
        completedLessons: [],
        totalLessons,
        isCompleted: false,
        certificateRequested: false,
        certificateIssued: false
      };

      const isCurrentlyCompleted = course.completedLessons.includes(lessonId);
      const newCompletedLessons = isCurrentlyCompleted
        ? course.completedLessons.filter(id => id !== lessonId)
        : [...course.completedLessons, lessonId];
      
      const isNowCompleted = newCompletedLessons.length === totalLessons;

      return {
        ...prev,
        courses: {
          ...prev.courses,
          [courseId]: {
            ...course,
            completedLessons: newCompletedLessons,
            isCompleted: isNowCompleted,
            completedAt: isNowCompleted && !course.completedAt ? new Date().toISOString() : course.completedAt
          }
        }
      };
    });
  }, []);

  const requestCertificate = useCallback((courseId: string) => {
    setProgress(prev => {
      const course = prev.courses[courseId];
      if (!course || !course.isCompleted) return prev;

      return {
        ...prev,
        courses: {
          ...prev.courses,
          [courseId]: {
            ...course,
            certificateRequested: true,
            certificateRequestedAt: new Date().toISOString()
          }
        }
      };
    });
  }, []);

  const issueCertificate = useCallback((courseId: string) => {
    setProgress(prev => {
      const course = prev.courses[courseId];
      if (!course) return prev;

      return {
        ...prev,
        courses: {
          ...prev.courses,
          [courseId]: {
            ...course,
            certificateIssued: true,
            certificateIssuedAt: new Date().toISOString()
          }
        }
      };
    });
  }, []);

  const getCourseProgress = useCallback((courseId: string): CourseProgress | null => {
    return progress.courses[courseId] || null;
  }, [progress]);

  const getProgressPercentage = useCallback((courseId: string, totalLessons: number): number => {
    const course = progress.courses[courseId];
    if (!course) return 0;
    return Math.round((course.completedLessons.length / totalLessons) * 100);
  }, [progress]);

  const markArticleRead = useCallback((articleId: string) => {
    setProgress(prev => ({
      ...prev,
      completedArticles: prev.completedArticles.includes(articleId)
        ? prev.completedArticles
        : [...prev.completedArticles, articleId]
    }));
  }, []);

  const markTipRead = useCallback((tipId: string) => {
    setProgress(prev => ({
      ...prev,
      completedTips: prev.completedTips.includes(tipId)
        ? prev.completedTips
        : [...prev.completedTips, tipId]
    }));
  }, []);

  return {
    progress,
    initializeCourse,
    toggleLessonComplete,
    requestCertificate,
    issueCertificate,
    getCourseProgress,
    getProgressPercentage,
    markArticleRead,
    markTipRead
  };
}
