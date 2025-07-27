"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
} from "lucide-react";

interface LoadingStep {
  id: string;
  label: string;
  status: "pending" | "loading" | "success" | "error";
  duration?: number;
}

interface AdvancedLoadingProps {
  steps: LoadingStep[];
  onRetry?: () => void;
  onComplete?: () => void;
  showProgress?: boolean;
  timeout?: number;
  className?: string;
}

export function AdvancedLoading({
  steps,
  onRetry,
  onComplete,
  showProgress = true,
  timeout = 30000,
  className = "",
}: AdvancedLoadingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsTimedOut(true);
    }, timeout);

    return () => clearTimeout(timer);
  }, [timeout]);

  useEffect(() => {
    if (currentStep < steps.length) {
      const step = steps[currentStep];
      if (step.status === "loading") {
        const interval = setInterval(() => {
          setProgress((prev) => {
            const newProgress = prev + 100 / (step.duration || 100);
            if (newProgress >= 100) {
              clearInterval(interval);
              setCurrentStep(currentStep + 1);
              return 100;
            }
            return newProgress;
          });
        }, 50);

        return () => clearInterval(interval);
      }
    }
  }, [currentStep, steps]);

  useEffect(() => {
    const completedSteps = steps.filter(
      (step) => step.status === "success"
    ).length;
    const totalSteps = steps.length;
    const overallProgress = (completedSteps / totalSteps) * 100;
    setProgress(overallProgress);

    if (completedSteps === totalSteps && onComplete) {
      onComplete();
    }
  }, [steps, onComplete]);

  const getStepIcon = (status: LoadingStep["status"]) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case "loading":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStepColor = (status: LoadingStep["status"]) => {
    switch (status) {
      case "pending":
        return "text-muted-foreground";
      case "loading":
        return "text-blue-600";
      case "success":
        return "text-green-600";
      case "error":
        return "text-red-600";
    }
  };

  const elapsedTime = Date.now() - startTime;

  return (
    <Card className={`w-full max-w-md mx-auto ${className}`}>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Zap className="h-8 w-8 mx-auto mb-2 text-blue-500" />
            </motion.div>
            <h3 className="text-lg font-semibold mb-1">Processing...</h3>
            <p className="text-sm text-muted-foreground">
              Please wait while we complete your request
            </p>
          </div>

          {/* Progress Bar */}
          {showProgress && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-mono">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Steps */}
          <div className="space-y-3">
            {steps.map((step, index) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  step.status === "loading" ? "bg-blue-50 border-blue-200" : ""
                }`}
              >
                {getStepIcon(step.status)}
                <div className="flex-1">
                  <p
                    className={`text-sm font-medium ${getStepColor(
                      step.status
                    )}`}
                  >
                    {step.label}
                  </p>
                  {step.status === "loading" && (
                    <p className="text-xs text-muted-foreground">
                      Processing...
                    </p>
                  )}
                </div>
                {step.status === "error" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onRetry}
                    className="h-6 px-2 text-xs"
                  >
                    Retry
                  </Button>
                )}
              </motion.div>
            ))}
          </div>

          {/* Timeout Warning */}
          <AnimatePresence>
            {isTimedOut && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This is taking longer than expected. You can try refreshing
                    or contact support if the issue persists.
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Elapsed Time */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Elapsed time: {Math.round(elapsedTime / 1000)}s
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {onRetry && (
              <Button
                variant="outline"
                onClick={onRetry}
                className="flex-1"
                size="sm"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Simplified loading component for quick use
export function SimpleLoading({
  message = "Loading...",
  className = "",
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-center p-8 ${className}`}>
      <div className="text-center space-y-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="h-8 w-8 mx-auto text-blue-500" />
        </motion.div>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

// Skeleton loading component
export function SkeletonLoading({
  lines = 3,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.1 }}
          className="h-4 bg-muted rounded animate-pulse"
          style={{ width: `${Math.random() * 40 + 60}%` }}
        />
      ))}
    </div>
  );
}
