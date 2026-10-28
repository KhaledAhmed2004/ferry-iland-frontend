import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/ui";

export type StatCardVariant =
  | "emerald"
  | "blue"
  | "amber"
  | "rose"
  | "purple"
  | "indigo"
  | "default";

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  // Title / Label
  label?: string;
  title?: string;
  labelClassName?: string;

  // Value
  value: React.ReactNode;
  valueClassName?: string;
  colorValue?: boolean;

  // Icon
  icon?: LucideIcon | React.ElementType;
  iconClassName?: string;
  iconContainerClassName?: string;
  iconColorClasses?: string;
  variant?: StatCardVariant;

  // Description / Subtitle / Custom Footer
  description?: React.ReactNode;
  footerNode?: React.ReactNode;

  // Trend / Growth Analytics (Optional for Overview dashboards)
  changePercent?: number;
  trend?: "up" | "down" | "neutral";
  comparisonText?: string;
  showWave?: boolean;
}

const variantStyles: Record<
  StatCardVariant,
  { icon: string; value: string }
> = {
  emerald: {
    icon: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    value: "text-emerald-600 dark:text-emerald-400"
  },
  blue: {
    icon: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    value: "text-blue-600 dark:text-blue-400"
  },
  amber: {
    icon: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    value: "text-amber-600 dark:text-amber-400"
  },
  rose: {
    icon: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    value: "text-rose-600 dark:text-rose-400"
  },
  purple: {
    icon: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    value: "text-purple-600 dark:text-purple-400"
  },
  indigo: {
    icon: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    value: "text-indigo-600 dark:text-indigo-400"
  },
  default: {
    icon: "bg-primary/10 text-primary",
    value: "text-foreground"
  }
};

export function TrendSparklineWave({
  trend = "neutral",
  className
}: {
  trend?: "up" | "down" | "neutral";
  className?: string;
}) {
  const gradientId = React.useId();

  const isUp = trend === "up";
  const isDown = trend === "down";

  const linePath = isUp
    ? "M0,24 C20,26 35,14 55,16 C75,18 85,6 100,4"
    : isDown
      ? "M0,6 C20,4 35,18 55,16 C75,14 85,24 100,26"
      : "M0,18 C20,12 40,22 60,14 C80,20 90,16 100,16";

  const areaPath = `${linePath} L100,32 L0,32 Z`;

  const strokeColor = isUp
    ? "stroke-emerald-500"
    : isDown
      ? "stroke-rose-500"
      : "stroke-blue-500/70 dark:stroke-blue-400/70";

  const stopColor = isUp ? "#10b981" : isDown ? "#f43f5e" : "#3b82f6";

  return (
    <div className={cn("relative h-8 w-20 overflow-hidden", className)}>
      <svg
        viewBox="0 0 100 32"
        fill="none"
        preserveAspectRatio="none"
        className="h-full w-full"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stopColor} stopOpacity={0.25} />
            <stop offset="100%" stopColor={stopColor} stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path
          d={linePath}
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={strokeColor}
        />
      </svg>
    </div>
  );
}

export function StatCard({
  label,
  title,
  labelClassName,
  value,
  valueClassName,
  colorValue = false,
  icon: Icon,
  iconClassName,
  iconContainerClassName,
  iconColorClasses,
  variant,
  description,
  footerNode,
  changePercent,
  trend,
  comparisonText,
  showWave = false,
  className,
  ...props
}: StatCardProps) {
  const displayTitle = title ?? label ?? "";

  // Resolve automatic variant if not explicitly supplied
  const effectiveVariant: StatCardVariant =
    variant ??
    (changePercent !== undefined && changePercent > 0
      ? "emerald"
      : changePercent !== undefined && changePercent < 0
        ? "rose"
        : "default");

  const variantConfig = variantStyles[effectiveVariant] || variantStyles.default;

  const resolvedValueClass =
    valueClassName ?? (colorValue ? variantConfig.value : "text-foreground");

  const resolvedIconColorClasses = iconColorClasses ?? variantConfig.icon;

  // Trend computation
  const hasTrend = changePercent !== undefined;
  const resolvedTrend: "up" | "down" | "neutral" =
    trend ||
    (changePercent === undefined || Math.abs(changePercent) < 0.001
      ? "neutral"
      : changePercent > 0
        ? "up"
        : "down");

  const isUp = resolvedTrend === "up";
  const isDown = resolvedTrend === "down";

  const formattedPercent =
    changePercent !== undefined
      ? Math.abs(changePercent) < 0.001
        ? "0.0%"
        : changePercent > 0
          ? `+${changePercent}%`
          : `${changePercent}%`
      : null;

  return (
    <Card
      className={cn(
        "border-border/80 bg-card shadow-xs transition-all duration-200 hover:shadow-sm",
        className
      )}
      {...props}
    >
      <CardContent className="flex items-center justify-between p-5">
        <div className="min-w-0 flex-1 space-y-0.5">
          {displayTitle && (
            <p
              className={cn(
                "text-muted-foreground text-xs font-semibold uppercase tracking-wider truncate",
                labelClassName
              )}
            >
              {displayTitle}
            </p>
          )}

          <p
            className={cn(
              "mt-1 text-2xl font-extrabold tracking-tight truncate",
              resolvedValueClass
            )}
          >
            {value}
          </p>

          {/* Analytics Mode: Trend Indicator & Comparison */}
          {(formattedPercent !== null || comparisonText) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
              {formattedPercent !== null && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold border",
                    isUp &&
                      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                    isDown &&
                      "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
                    !isUp &&
                      !isDown &&
                      "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                  )}
                >
                  {isUp && <TrendingUp className="h-3 w-3" />}
                  {isDown && <TrendingDown className="h-3 w-3" />}
                  {!isUp && !isDown && <Activity className="h-3 w-3" />}
                  <span>{formattedPercent}</span>
                </span>
              )}
              {comparisonText && (
                <span className="text-muted-foreground text-[11px] font-medium truncate">
                  {comparisonText}
                </span>
              )}
            </div>
          )}

          {/* Metric Mode: Subtitle description */}
          {description && (
            typeof description === "string" ? (
              <p className="text-muted-foreground mt-0.5 text-[11px] truncate">
                {description}
              </p>
            ) : (
              description
            )
          )}

          {footerNode}
        </div>

        {/* Right side Icon & optional sparkline */}
        <div className="ml-3 flex shrink-0 items-center gap-2">
          {showWave && <TrendSparklineWave trend={resolvedTrend} />}

          {Icon && (
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors",
                resolvedIconColorClasses,
                iconContainerClassName
              )}
            >
              <Icon className={cn("h-5 w-5", iconClassName)} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

