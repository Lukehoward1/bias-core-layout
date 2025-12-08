import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Award, Download, CheckCircle, Clock, X } from "lucide-react";
import { format } from "date-fns";
import { useRef } from "react";

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseName: string;
  studentName: string;
  completedAt: string;
  certificateRequested: boolean;
  certificateIssued: boolean;
  onRequestCertificate: () => void;
  onGeneratePdf: () => void;
}

export function CertificateModal({
  isOpen,
  onClose,
  courseName,
  studentName,
  completedAt,
  certificateRequested,
  certificateIssued,
  onRequestCertificate,
  onGeneratePdf
}: CertificateModalProps) {
  const certificateRef = useRef<HTMLDivElement>(null);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto scrollbar-hidden p-0 gap-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card border-b border-border px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-success/20 text-success">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Course Completed!</h2>
              <p className="text-sm text-muted-foreground">Congratulations on finishing {courseName}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Certificate Preview */}
        <div className="p-8">
          <div 
            ref={certificateRef}
            id="certificate-preview"
            className="relative bg-gradient-to-br from-card via-card to-muted/30 border-2 border-primary/20 rounded-xl p-8 md:p-12 overflow-hidden"
          >
            {/* Decorative Elements */}
            <div className="absolute top-0 left-0 w-32 h-32 bg-primary/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-48 h-48 bg-primary/5 rounded-full translate-x-1/2 translate-y-1/2" />
            <div className="absolute top-4 right-4 w-20 h-20 border border-primary/20 rounded-full" />
            <div className="absolute bottom-4 left-4 w-16 h-16 border border-primary/20 rounded-full" />

            {/* Certificate Content */}
            <div className="relative z-10 text-center space-y-6">
              {/* Logo */}
              <div className="flex justify-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
                    SB
                  </div>
                  <span className="text-2xl font-bold text-foreground">StreamBias</span>
                </div>
              </div>

              {/* Title */}
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">Certificate of Completion</p>
                <div className="w-24 h-0.5 bg-primary mx-auto" />
              </div>

              {/* Recipient */}
              <div className="py-4">
                <p className="text-sm text-muted-foreground mb-2">This is to certify that</p>
                <h3 className="text-3xl md:text-4xl font-bold text-foreground">{studentName}</h3>
              </div>

              {/* Achievement */}
              <div className="py-4">
                <p className="text-sm text-muted-foreground mb-2">has successfully completed the course</p>
                <h4 className="text-xl md:text-2xl font-semibold text-primary">{courseName}</h4>
              </div>

              {/* Date */}
              <div className="py-4">
                <p className="text-sm text-muted-foreground">Completed on</p>
                <p className="text-lg font-medium text-foreground">{format(new Date(completedAt), 'MMMM d, yyyy')}</p>
              </div>

              {/* Signature */}
              <div className="pt-6 flex justify-center">
                <div className="text-center">
                  <div className="w-40 border-t border-border mb-2" />
                  <p className="text-xs text-muted-foreground">StreamBias Education</p>
                  <Badge variant="outline" className="mt-2 bg-success/10 text-success border-success/30">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 space-y-4">
            {!certificateRequested && (
              <div className="bg-muted/30 rounded-lg p-6 text-center">
                <Award className="h-10 w-10 text-primary mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-2">Ready for your certificate?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Request your official completion certificate to add to your professional portfolio.
                </p>
                <Button onClick={onRequestCertificate} className="gap-2">
                  <Award className="h-4 w-4" />
                  Request Completion Certificate
                </Button>
              </div>
            )}

            {certificateRequested && !certificateIssued && (
              <div className="bg-warning/10 border border-warning/30 rounded-lg p-6 text-center">
                <Clock className="h-10 w-10 text-warning mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-2">Certificate Requested</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Your certificate request has been submitted. You can generate a preview PDF now, or wait for official issuance.
                </p>
                <Button onClick={onGeneratePdf} variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Generate Preview PDF
                </Button>
              </div>
            )}

            {certificateIssued && (
              <div className="bg-success/10 border border-success/30 rounded-lg p-6 text-center">
                <CheckCircle className="h-10 w-10 text-success mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-2">Certificate Issued</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Your official certificate is ready! Download it to share with employers or add to your portfolio.
                </p>
                <Button onClick={onGeneratePdf} className="gap-2 bg-success hover:bg-success/90">
                  <Download className="h-4 w-4" />
                  Download Certificate PDF
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
