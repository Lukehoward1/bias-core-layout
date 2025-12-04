import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PdfExportButtonProps {
  onClick: () => void;
  label?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default" | "lg" | "icon";
  className?: string;
}

export function PdfExportButton({ 
  onClick, 
  label = "PDF", 
  variant = "ghost",
  size = "sm",
  className = ""
}: PdfExportButtonProps) {
  return (
    <Button 
      variant={variant} 
      size={size} 
      className={`gap-1.5 text-xs h-7 ${className}`}
      onClick={onClick}
      data-pdf-exclude
    >
      <Download className="h-3.5 w-3.5" />
      {label}
    </Button>
  );
}
