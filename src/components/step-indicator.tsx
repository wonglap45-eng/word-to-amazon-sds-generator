"use client";

import { cn } from "@/lib/utils";
import type { WizardStep } from "@/lib/types";
import { Check } from "lucide-react";

interface Step {
  number: WizardStep;
  label: string;
}

const STEPS: Step[] = [
  { number: 1, label: "Upload Word" },
  { number: 2, label: "Review Parsed Data" },
  { number: 3, label: "SDS Settings" },
  { number: 4, label: "Generate PDF" },
];

interface StepIndicatorProps {
  current_step: WizardStep;
  on_step_click?: (step: WizardStep) => void;
}

export function StepIndicator({
  current_step,
  on_step_click,
}: StepIndicatorProps) {
  return (
    <nav aria-label="Wizard steps" className="w-full">
      <ol className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const step_number = step.number;
          const is_active = current_step === step_number;
          const is_completed = current_step > step_number;
          const is_clickable = is_completed;
          const is_last = index === STEPS.length - 1;

          return (
            <li
              key={step_number}
              className={cn(
                "flex items-center",
                !is_last && "flex-1"
              )}
            >
              <button
                type="button"
                onClick={() => {
                  if (is_clickable && on_step_click) {
                    on_step_click(step_number);
                  }
                }}
                disabled={!is_clickable && !is_active}
                className={cn(
                  "flex items-center gap-2 text-sm font-medium transition-colors",
                  is_active && "text-primary",
                  is_completed && "text-primary cursor-pointer",
                  !is_active && !is_completed && "text-muted-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors",
                    is_active &&
                      "border-primary bg-primary text-primary-foreground",
                    is_completed &&
                      "border-primary bg-primary text-primary-foreground",
                    !is_active &&
                      !is_completed &&
                      "border-muted-foreground bg-transparent text-muted-foreground"
                  )}
                >
                  {is_completed ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    step_number
                  )}
                </span>
                <span className="hidden sm:inline">{step.label}</span>
              </button>

              {/* Connector line */}
              {!is_last && (
                <div
                  className={cn(
                    "mx-2 flex-1 h-px transition-colors",
                    is_completed ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
