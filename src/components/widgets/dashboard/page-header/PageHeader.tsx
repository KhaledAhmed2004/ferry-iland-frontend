import * as React from "react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  badge,
  actions,
  children,
  className
}: PageHeaderProps) {
  const rightContent = actions || children;

  return (
    <div
      className={cn(
        "flex flex-col justify-between gap-4 sm:flex-row sm:items-center",
        className
      )}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p className="text-muted-foreground text-xs sm:text-sm">
            {description}
          </p>
        )}
      </div>

      {rightContent && (
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {rightContent}
        </div>
      )}
    </div>
  );
}
