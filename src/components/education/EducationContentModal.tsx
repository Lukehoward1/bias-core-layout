import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, BookOpen, Bookmark, X } from "lucide-react";

interface EducationContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: {
    title: string;
    type: 'article' | 'tip' | 'resource';
    level?: 'Beginner' | 'Intermediate' | 'Advanced';
    readTime?: string;
    duration?: string;
    tags?: string[];
    content: string;
  } | null;
}

function renderContent(text: string) {
  const isHeading = (s: string) => {
    const letters = s.replace(/[^a-zA-Z]/g, '');
    return letters.length >= 2 && s.length >= 4 &&
      (letters.match(/[A-Z]/g) ?? []).length / letters.length >= 0.8;
  };
  const lines = text.split('\n');
  const out: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }
    if (isHeading(line)) {
      out.push(
        <h3 key={i} className="text-xs font-bold text-foreground/70 mt-6 mb-2 tracking-widest uppercase">
          {line}
        </h3>
      );
      i++;
      continue;
    }
    if (/^\d+\./.test(line)) {
      const start = i;
      const items: string[] = [];
      while (i < lines.length && /^\d+\./.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s*/, ''));
        i++;
      }
      out.push(
        <ol key={start} className="my-3 pl-5 space-y-1.5 list-decimal">
          {items.map((item, j) => (
            <li key={j} className="text-sm text-foreground leading-relaxed">{item}</li>
          ))}
        </ol>
      );
      continue;
    }
    if (line.startsWith('•')) {
      const start = i;
      const items: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('•')) {
        items.push(lines[i].trim().slice(1).trim());
        i++;
      }
      out.push(
        <ul key={start} className="my-3 space-y-1.5">
          {items.map((item, j) => (
            <li key={j} className="flex gap-2 items-start text-sm text-foreground leading-relaxed">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary/50 flex-shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }
    out.push(
      <p key={i} className="text-sm text-foreground leading-relaxed my-3">{line}</p>
    );
    i++;
  }
  return <>{out}</>;
}

export function EducationContentModal({ isOpen, onClose, content }: EducationContentModalProps) {
  if (!content) return null;

  const getLevelColor = (level?: string) => {
    switch (level) {
      case 'Beginner': return 'bg-success/20 text-success border-success/30';
      case 'Intermediate': return 'bg-warning/20 text-warning border-warning/30';
      case 'Advanced': return 'bg-destructive/20 text-destructive border-destructive/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-y-auto scrollbar-hidden p-0 gap-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card border-b border-border px-8 py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                {content.level && (
                  <Badge variant="outline" className={getLevelColor(content.level)}>
                    {content.level}
                  </Badge>
                )}
                {content.type === 'article' && (
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                    <BookOpen className="h-3 w-3 mr-1" />
                    Article
                  </Badge>
                )}
                {content.type === 'resource' && (
                  <Badge variant="outline" className="bg-accent/50 text-accent-foreground">
                    Resource
                  </Badge>
                )}
              </div>
              <DialogTitle className="text-2xl font-bold text-foreground">
                {content.title}
              </DialogTitle>
              <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                {content.readTime && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {content.readTime}
                  </span>
                )}
                {content.duration && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {content.duration}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <Bookmark className="h-4 w-4" />
                Save
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {content.tags && content.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {content.tags.map((tag, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="px-8 py-8">
          <div className="max-w-2xl mx-auto">
            {renderContent(content.content)}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
