"use client";

import * as React from "react";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/ui";

export interface DataTableRowAction {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onSelect?: () => void;
  href?: string;
  /** Red text, for delete / suspend style actions. */
  destructive?: boolean;
  disabled?: boolean;
  /** Draw a separator above this item. */
  separatorBefore?: boolean;
}

/** shadcn data-table row "⋯" menu. */
export function DataTableRowActions({
  actions,
  label = "Actions",
  srLabel = "Open menu"
}: {
  actions: DataTableRowAction[];
  label?: string;
  srLabel?: string;
}) {
  return (
    <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="data-[state=open]:bg-muted h-8 w-8 p-0">
            <span className="sr-only">{srLabel}</span>
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-40">
          <DropdownMenuLabel>{label}</DropdownMenuLabel>
          {actions.map((action) => {
            const Icon = action.icon;
            const content = (
              <>
                {Icon && <Icon className={cn("size-4", !action.destructive && "text-muted-foreground")} />}
                {action.label}
              </>
            );
            return (
              <React.Fragment key={action.label}>
                {action.separatorBefore && <DropdownMenuSeparator />}
                {action.href ? (
                  <DropdownMenuItem asChild disabled={action.disabled}>
                    <Link href={action.href}>{content}</Link>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    disabled={action.disabled}
                    variant={action.destructive ? "destructive" : "default"}
                    onSelect={() => action.onSelect?.()}
                  >
                    {content}
                  </DropdownMenuItem>
                )}
              </React.Fragment>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
