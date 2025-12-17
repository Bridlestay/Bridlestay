"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { PropertyBasicsStep } from "@/components/host/steps/basics-step";
import { PropertyAmenitiesStep } from "@/components/host/steps/amenities-step";
import { PropertyEquineStep } from "@/components/host/steps/equine-step";
import { PropertyFacilityPhotosStep } from "@/components/host/steps/facility-photos-step";
import { PropertyPhotosStep } from "@/components/host/steps/photos-step";
import { PropertyPricingStep } from "@/components/host/steps/pricing-step";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface PropertyWizardProps {
  userId: string;
  propertyId?: string;
  initialData?: any;
}

export function PropertyWizard({ userId, propertyId, initialData }: PropertyWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [propertyData, setPropertyData] = useState<any>(initialData || {});
  const router = useRouter();
  const { toast } = useToast();

  const steps = [
    { number: 1, title: "Basics", component: PropertyBasicsStep },
    { number: 2, title: "Amenities", component: PropertyAmenitiesStep },
    { number: 3, title: "Horse Facilities", component: PropertyEquineStep },
    { number: 4, title: "Facility Photos", component: PropertyFacilityPhotosStep },
    { number: 5, title: "Property Photos", component: PropertyPhotosStep },
    { number: 6, title: "Pricing", component: PropertyPricingStep },
  ];

  const CurrentStepComponent = steps[currentStep - 1].component;
  const progress = (currentStep / steps.length) * 100;

  const handleNext = (data: any) => {
    console.log("handleNext called with:", data);
    console.log("Current propertyData:", propertyData);
    const updatedData = { ...propertyData, ...data };
    console.log("Updated propertyData:", updatedData);
    setPropertyData(updatedData);
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleStepClick = (stepNumber: number) => {
    // Save current data before switching steps
    setCurrentStep(stepNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveDraft = async () => {
    try {
      const response = await fetch("/api/host/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          propertyId,
          ...propertyData,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save draft");
      }

      const result = await response.json();
      
      toast({
        title: "Draft saved",
        description: "Your listing has been saved as a draft.",
      });

      // Update propertyId if it was just created
      if (result.propertyId && !propertyId) {
        router.push(`/host/property/${result.propertyId}/edit`);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save draft",
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-4xl font-bold mb-2">
          {propertyId ? "Edit" : "Create"} your listing
        </h1>
        <p className="text-muted-foreground">
          Step {currentStep} of {steps.length}: {steps[currentStep - 1].title}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between mt-6 gap-2">
          {steps.map((step) => (
            <button
              key={step.number}
              onClick={() => handleStepClick(step.number)}
              className={`flex flex-col items-center gap-2 text-sm transition-all hover:text-primary cursor-pointer group ${
                step.number === currentStep
                  ? "text-primary"
                  : step.number < currentStep
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  step.number === currentStep
                    ? "bg-primary text-primary-foreground"
                    : step.number < currentStep
                    ? "bg-primary/20 text-primary group-hover:bg-primary/30"
                    : "bg-muted text-muted-foreground group-hover:bg-muted/80"
                }`}
              >
                {step.number}
              </div>
              <span
                className={`font-medium ${
                  step.number === currentStep ? "font-semibold" : ""
                }`}
              >
                {step.title}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{steps[currentStep - 1].title}</CardTitle>
        </CardHeader>
        <CardContent>
          <CurrentStepComponent
            data={propertyData}
            onNext={handleNext}
            onBack={handleBack}
            onSaveDraft={handleSaveDraft}
            userId={userId}
            propertyId={propertyId}
          />
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 1}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button variant="ghost" onClick={handleSaveDraft}>
          Save Draft
        </Button>
      </div>
    </div>
  );
}

