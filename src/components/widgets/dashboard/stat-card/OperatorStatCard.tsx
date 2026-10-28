import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/ui";

export type OperatorStatCardVariant =
  | "emerald"
  | "blue"
  | "amber"
  | "rose"
  | "purple"
  | "indigo"
  | "default";

export interface OperatorStatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  label?: string;
  value: React.ReactNode;
  description?: React.ReactNode;
  footerNode?: React.ReactNode;
  icon: LucideIcon | React.ElementType;
  variant?: OperatorStatCardVariant;
  colorValue?: boolean;
  valueClassName?: string;
  iconColorClasses?: string;
  iconClassName?: string;
  iconContainerClassName?: string;
}

const variantStyles: Record<
  OperatorStatCardVariant,
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
    icon: "bg-muted text-muted-foreground",
    value: "text-foreground"
  }
};

export function OperatorStatCard({
  title,
  label,
  value,
  description,
  footerNode,
  icon: Icon,
  variant = "emerald",
  colorValue = false,
  valueClassName,
  iconColorClasses,
  iconClassName,
  iconContainerClassName,
  className,
  ...props
}: OperatorStatCardProps) {
  const displayTitle = title ?? label ?? "";
  const variantConfig = variantStyles[variant] || variantStyles.default;

  // Resolve value styling: explicit valueClassName takes top precedence;
  // then colorValue flag (if true, uses variant color); otherwise default text-foreground.
  const resolvedValueClass =
    valueClassName ?? (colorValue ? variantConfig.value : "text-foreground");

  const resolvedIconColorClasses = iconColorClasses ?? variantConfig.icon;

  return (
    <Card className={cn("border-border/80 bg-card shadow-xs", className)} {...props}>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          {displayTitle && (
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              {displayTitle}
            </p>
          )}
          <p className={cn("mt-1 text-2xl font-extrabold tracking-tight", resolvedValueClass)}>
            {value}
          </p>
          {description && (
            typeof description === "string" ? (
              <p className="text-muted-foreground mt-0.5 text-[11px]">{description}</p>
            ) : (
              description
            )
          )}
          {footerNode}
        </div>
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl",
            resolvedIconColorClasses,
            iconContainerClassName
          )}
        >
          <Icon className={cn("h-5 w-5", iconClassName)} />
        </div>
      </CardContent>
    </Card>
  );
}
