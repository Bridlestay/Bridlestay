"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Flag, 
  Loader2, 
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ReportButtonProps {
  contentType: 'review' | 'message' | 'property' | 'route' | 'comment' | 'photo' | 'profile' | 'other';
  contentId: string;
  contentOwnerId?: string;
  contentPreview?: string;
  variant?: 'icon' | 'text' | 'minimal';
  className?: string;
}

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam', description: 'Unwanted promotional content' },
  { value: 'harassment', label: 'Harassment', description: 'Bullying or targeted abuse' },
  { value: 'hate_speech', label: 'Hate Speech', description: 'Discriminatory content' },
  { value: 'inappropriate_content', label: 'Inappropriate Content', description: 'Adult or offensive material' },
  { value: 'off_platform_payment', label: 'Off-Platform Payment', description: 'Attempts to bypass platform payments' },
  { value: 'fake_or_misleading', label: 'Fake or Misleading', description: 'False information or scam' },
  { value: 'privacy_violation', label: 'Privacy Violation', description: 'Sharing personal information' },
  { value: 'safety_concern', label: 'Safety Concern', description: 'Risk to safety of people or horses' },
  { value: 'copyright', label: 'Copyright', description: 'Unauthorized use of content' },
  { value: 'other', label: 'Other', description: 'Something else not listed' },
];

export function ReportButton({
  contentType,
  contentId,
  contentOwnerId,
  contentPreview,
  variant = 'minimal',
  className = '',
}: ReportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'confirm' | 'reason' | 'success'>('confirm');
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleOpen = () => {
    setIsOpen(true);
    setStep('confirm');
    setSelectedReason('');
    setDescription('');
  };

  const handleClose = () => {
    setIsOpen(false);
    setStep('confirm');
  };

  const handleConfirm = () => {
    setStep('reason');
  };

  const handleSubmit = async () => {
    if (!selectedReason) {
      toast({
        variant: "destructive",
        title: "Please select a reason",
        description: "Choose why you're reporting this content",
      });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/moderation/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType,
          contentId,
          contentOwnerId,
          contentPreview: contentPreview?.substring(0, 200),
          reportReason: selectedReason,
          reportDescription: description.substring(0, 100) || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit report');
      }

      setStep('success');
      
      // Auto-close after success
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Report failed",
        description: error.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Render button based on variant
  const renderButton = () => {
    if (variant === 'minimal') {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleOpen}
                className={`inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 hover:bg-red-200 text-red-600 transition-colors ${className}`}
                aria-label="Report content"
              >
                <Flag className="h-3 w-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Report</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    if (variant === 'icon') {
      return (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleOpen}
          className={`text-muted-foreground hover:text-red-600 ${className}`}
          aria-label="Report content"
        >
          <Flag className="h-4 w-4" />
        </Button>
      );
    }

    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleOpen}
        className={`text-muted-foreground hover:text-red-600 ${className}`}
      >
        <Flag className="h-4 w-4 mr-1" />
        Report
      </Button>
    );
  };

  return (
    <>
      {renderButton()}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          {step === 'confirm' && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  Report Content
                </DialogTitle>
                <DialogDescription>
                  Are you sure you want to report this content? False reports may affect your account.
                </DialogDescription>
              </DialogHeader>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Only report content that genuinely violates our community guidelines. 
                  Our team reviews all reports and takes action where appropriate.
                </AlertDescription>
              </Alert>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={handleConfirm} className="bg-red-600 hover:bg-red-700">
                  Yes, Report
                </Button>
              </DialogFooter>
            </>
          )}

          {step === 'reason' && (
            <>
              <DialogHeader>
                <DialogTitle>Why are you reporting this?</DialogTitle>
                <DialogDescription>
                  Select the reason that best describes the issue
                </DialogDescription>
              </DialogHeader>
              
              <div className="max-h-[300px] overflow-y-auto py-2">
                <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
                  {REPORT_REASONS.map((reason) => (
                    <Label
                      key={reason.value}
                      htmlFor={reason.value}
                      className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedReason === reason.value 
                          ? 'bg-red-50 border border-red-200' 
                          : 'hover:bg-muted'
                      }`}
                    >
                      <RadioGroupItem value={reason.value} id={reason.value} className="mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">{reason.label}</p>
                        <p className="text-xs text-muted-foreground">{reason.description}</p>
                      </div>
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="description" className="text-sm">
                  Additional details (optional)
                </Label>
                <Input
                  id="description"
                  placeholder="Brief explanation (max 100 chars)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 100))}
                  maxLength={100}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {description.length}/100
                </p>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setStep('confirm')}>
                  Back
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={!selectedReason || submitting}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Report'
                  )}
                </Button>
              </DialogFooter>
            </>
          )}

          {step === 'success' && (
            <div className="py-8 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Report Submitted</h3>
              <p className="text-muted-foreground text-sm">
                Thank you for helping keep our community safe. Our team will review your report.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

