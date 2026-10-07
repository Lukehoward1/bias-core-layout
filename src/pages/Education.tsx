import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EducationContentModal } from "@/components/education/EducationContentModal";
import { useTapHandler } from "@/hooks/use-tap-handler";
import { articles, tips, calculateReadTime } from "@/data/educationContent";
import {
  Clock,
  BookOpen,
  Bookmark,
} from "lucide-react";

const LEVEL_ORDER: Record<string, number> = { Beginner: 0, Intermediate: 1, Advanced: 2 };

type ContentModalPayload = {
  title: string;
  type: "article" | "tip" | "resource";
  level?: "Beginner" | "Intermediate" | "Advanced";
  readTime?: string;
  tags?: string[];
  content: string;
};

export default function Education() {
  const tap = useTapHandler();
  const [searchParams] = useSearchParams();
  const showTips = searchParams.get("view") === "tips";

  const [selectedContent, setSelectedContent] = useState<ContentModalPayload | null>(null);
  const [levelFilter, setLevelFilter] = useState("All");

  // Deep-link support: open reader modal when ?article= or ?tip= param is present
  useEffect(() => {
    const articleId = searchParams.get("article");
    const tipId = searchParams.get("tip");
    if (articleId) {
      const a = articles.find(x => x.id === articleId);
      if (a) setSelectedContent({ title: a.title, type: "article", level: a.level, readTime: calculateReadTime(a.content), tags: a.tags, content: a.content });
    } else if (tipId) {
      const t = tips.find(x => x.id === tipId);
      if (t) setSelectedContent({ title: t.title, type: "tip", level: "Beginner", readTime: calculateReadTime(t.content), tags: t.tags, content: t.content });
    }
  }, [searchParams]);

  const sortedFilteredArticles = [...articles]
    .sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level])
    .filter(a => levelFilter === "All" || a.level === levelFilter);

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
              {tips.map((tip) => {
                const openTip = () =>
                  setSelectedContent({
                    title: tip.title,
                    type: "tip",
                    level: "Beginner",
                    readTime: calculateReadTime(tip.content),
                    tags: tip.tags,
                    content: tip.content,
                  });
                return (
                <Card
                  key={tip.id}
                  className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer group flex flex-col select-none [-webkit-touch-callout:none]"
                  onClick={openTip}
                  {...tap(openTip)}
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
                        {calculateReadTime(tip.content)} read
                      </Badge>
                      {tip.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[10px]">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                );
              })}
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

          <div className="flex gap-2 mb-4 flex-wrap">
            {(["All", "Beginner", "Intermediate", "Advanced"] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setLevelFilter(level)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  levelFilter === level
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                {level}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedFilteredArticles.length === 0 ? (
              <p className="text-sm text-muted-foreground col-span-2 py-8 text-center">
                No guides in this category yet.
              </p>
            ) : sortedFilteredArticles.map((article) => {
              const openArticle = () =>
                setSelectedContent({
                  title: article.title,
                  type: "article",
                  level: article.level,
                  readTime: calculateReadTime(article.content),
                  tags: article.tags,
                  content: article.content,
                });
              return (
              <Card
                key={article.id}
                className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer group flex flex-col select-none [-webkit-touch-callout:none]"
                onClick={openArticle}
                {...tap(openArticle)}
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
                        {calculateReadTime(article.content)} read
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
              );
            })}
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
