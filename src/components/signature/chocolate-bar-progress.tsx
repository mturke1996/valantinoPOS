"use client";

import { cn } from "@/lib/utils";

export const ORDER_PIPELINE_STAGES = [
  "received",
  "reviewing",
  "preparing",
  "packaging",
  "ready",
  "out_for_delivery",
  "delivered",
  "completed",
] as const;

export type OrderPipelineStage = (typeof ORDER_PIPELINE_STAGES)[number];

const STAGE_LABELS: Record<OrderPipelineStage, string> = {
  received: "مستلم",
  reviewing: "مراجعة",
  preparing: "تحضير",
  packaging: "تغليف",
  ready: "جاهز",
  out_for_delivery: "توصيل",
  delivered: "مُسلّم",
  completed: "مكتمل",
};

const SEGMENT_COUNT = 8;

export interface ChocolateBarProgressProps {
  currentStage: OrderPipelineStage | number;
  className?: string;
  size?: "sm" | "md" | "lg";
  showLabels?: boolean;
  interactive?: boolean;
  onStageClick?: (stageIndex: number) => void;
}

function resolveStageIndex(
  currentStage: OrderPipelineStage | number,
): number {
  if (typeof currentStage === "number") {
    return Math.min(Math.max(currentStage, 0), SEGMENT_COUNT);
  }

  const index = ORDER_PIPELINE_STAGES.indexOf(currentStage);
  return index === -1 ? 0 : index + 1;
}

export function ChocolateBarProgress({
  currentStage,
  className,
  size = "md",
  showLabels = false,
  interactive = false,
  onStageClick,
}: ChocolateBarProgressProps) {
  const completedCount = resolveStageIndex(currentStage);

  const sizeClasses = {
    sm: "h-3 gap-0.5",
    md: "h-4 gap-1",
    lg: "h-5 gap-1.5",
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div
        className={cn("flex w-full", sizeClasses[size])}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={SEGMENT_COUNT}
        aria-valuenow={completedCount}
        aria-label="تقدم الطلب"
      >
        {Array.from({ length: SEGMENT_COUNT }).map((_, index) => {
          const isComplete = index < completedCount;
          const isCurrent = index === completedCount - 1;
          const stage = ORDER_PIPELINE_STAGES[index];

          const segmentClassName = cn(
            "relative flex-1 overflow-hidden rounded-sm border transition-all duration-200 ease-spring",
            "border-cacao-800/12 bg-cream-100/60 dark:border-cacao-800/20 dark:bg-cacao-800/30",
            isComplete &&
              "border-cacao-800/20 bg-cacao-800 dark:bg-cacao-800",
            isCurrent && "ring-1 ring-gold-400/50",
            interactive &&
              onStageClick &&
              "cursor-pointer hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2",
          );

          const segmentContent = (
            <>
              <div
                className={cn(
                  "absolute inset-0 origin-bottom scale-y-0 bg-gradient-to-t from-cacao-800 to-gold-400 transition-transform duration-300 ease-spring motion-reduce:transition-none",
                  isComplete && "scale-y-100",
                )}
              />
              {isComplete ? (
                <div className="absolute inset-x-0 top-0 h-px bg-gold-400/40" />
              ) : null}
            </>
          );

          if (interactive && onStageClick) {
            return (
              <button
                key={stage}
                type="button"
                className={cn(segmentClassName, "appearance-none p-0")}
                onClick={() => onStageClick(index)}
                aria-label={`${STAGE_LABELS[stage]} — المرحلة ${index + 1}`}
                title={STAGE_LABELS[stage]}
              >
                {segmentContent}
              </button>
            );
          }

          return (
            <div
              key={stage}
              className={segmentClassName}
              title={STAGE_LABELS[stage]}
            >
              {segmentContent}
            </div>
          );
        })}
      </div>

      {showLabels ? (
        <div className="flex justify-between gap-1 text-[10px] text-muted-foreground">
          {ORDER_PIPELINE_STAGES.map((stage) => (
            <span key={stage} className="flex-1 truncate text-center">
              {STAGE_LABELS[stage]}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
