"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarX,
  ClipboardList,
  Clock,
  LayoutDashboard,
  LogOut,
  Settings,
  Ship,
  Ticket
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks";
import { useOperatorSettingsQuery } from "@/hooks/use-operator";
import { Button } from "@/ui";
import { BrandLogo } from "@/widgets";
import { OperatorLogoMark } from "./OperatorLogoMark";

export interface ProviderNavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

export const PROVIDER_NAV_ITEMS: ProviderNavItem[] = [
  {
    name: "Overview",
    href: "/dashboard/operator",
    icon: LayoutDashboard
  },
  {
    name: "Ferries",
    href: "/dashboard/operator/ferries",
    icon: Ship
  },
  {
    name: "Schedules",
    href: "/dashboard/operator/schedules",
    icon: Clock
  },
  {
    name: "Off Days",
    href: "/dashboard/operator/off-days",
    icon: CalendarX
  },
  {
    name: "Bookings",
    href: "/dashboard/operator/bookings",
    icon: Ticket
  },
  {
    name: "Manifest",
    href: "/dashboard/operator/manifest",
    icon: ClipboardList
  },
  {
    name: "Settings",
    href: "/dashboard/operator/settings",
    icon: Settings
  }
];

interface ProviderSidebarProps {
  onItemClick?: () => void;
  className?: string;
}

export function ProviderSidebar({ onItemClick, className }: ProviderSidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { data: operatorSettings } = useOperatorSettingsQuery();

  const companyName =
    operatorSettings?.companyName ||
    user?.operatorProfile?.companyName ||
    "Operator";

  const contactPerson =
    operatorSettings?.contactPersonName ||
    user?.operatorProfile?.contactPersonName ||
    user?.name ||
    "Operator Admin";

  const contactEmail =
    operatorSettings?.contactEmail ||
    user?.operatorProfile?.contactEmail ||
    user?.email ||
    "operator@ferrygo.com";

  const isItemActive = (item: ProviderNavItem) => {
    if (item.name === "Overview") {
      return (
        pathname === "/dashboard/operator" ||
        pathname === "/dashboard"
      );
    }
    return pathname.startsWith(item.href);
  };

  return (
    <aside
      className={cn(
        "bg-card text-card-foreground border-border/80 flex h-full w-64 flex-col border-r shadow-xs",
        className
      )}
    >
      {/* Brand & Provider Portal Header */}
      <div className="border-border/80 flex h-16 items-center justify-between border-b px-4 sm:px-5">
        <BrandLogo
          size="md"
          href="/dashboard/operator"
          icon={<OperatorLogoMark companyName={companyName} logoUrl={operatorSettings?.logoUrl} />}
          iconClassName="rounded-full ring-2 ring-sky-400/60 shadow-xs overflow-hidden shrink-0"
          onClick={onItemClick}
          title={
            <span
              className="block truncate max-w-[175px] font-extrabold text-xs sm:text-sm tracking-tight leading-tight text-foreground"
              title={companyName}
            >
              {companyName}
            </span>
          }
          subtitle="OPERATOR PORTAL"
        />
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mb-3 px-3 text-xs font-bold tracking-wider text-muted-foreground uppercase">
          Operator Console
        </div>
        <nav className="space-y-2">
          {PROVIDER_NAV_ITEMS.map((item) => {
            const active = isItemActive(item);
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onItemClick}
                className={cn(
                  "flex items-center gap-3.5 rounded-lg px-4 py-3 text-sm font-semibold transition-all",
                  active
                    ? "bg-emerald-600 text-white shadow-xs font-bold"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 shrink-0 transition-colors",
                    active ? "text-white" : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info & Actions */}
      <div className="border-border/80 border-t p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold text-sm">
              {contactPerson ? contactPerson.charAt(0).toUpperCase() : "O"}
            </div>
            <div className="flex flex-col overflow-hidden min-w-0">
              <span className="truncate text-sm font-bold text-foreground" title={contactPerson}>
                {contactPerson}
              </span>
              <span className="truncate text-xs text-muted-foreground" title={contactEmail}>
                {contactEmail}
              </span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            className="text-muted-foreground hover:text-destructive h-8.5 w-8.5 shrink-0"
            title="Log Out"
          >
            <LogOut className="h-4.5 w-4.5" />
            <span className="sr-only">Log Out</span>
          </Button>
        </div>
      </div>
    </aside>
  );
}
