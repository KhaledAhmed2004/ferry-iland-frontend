"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Ban,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Loader2,
  Mail,
  Phone,
  Shield,
  ShieldAlert,
  XCircle
} from "lucide-react";
import { toast } from "sonner";
import type { IAdminUserItem } from "@/types";
import { useUpdateUserStatusMutation } from "@/hooks/use-users";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle
} from "@/ui";

export interface UserDetailsModalProps {
  user: IAdminUserItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange?: (user: IAdminUserItem, nextStatus: "ACTIVE" | "SUSPENDED") => void;
}

export function UserDetailsModal({
  user,
  open,
  onOpenChange,
  onStatusChange
}: UserDetailsModalProps) {
  if (!user) return null;

  const [localStatus, setLocalStatus] = React.useState<string>(user.status || "ACTIVE");
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);
  const updateStatusMutation = useUpdateUserStatusMutation();

  React.useEffect(() => {
    if (user?.status) {
      setLocalStatus(user.status);
    }
  }, [user?.status]);

  const handleToggleStatus = async () => {
    const nextStatus = localStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try {
      await updateStatusMutation.mutateAsync({
        userId: user.id,
        status: nextStatus
      });
      setLocalStatus(nextStatus);
      toast.success(
        nextStatus === "SUSPENDED"
          ? "Passenger account suspended successfully"
          : "Passenger account activated successfully"
      );
      if (onStatusChange) {
        onStatusChange(user, nextStatus);
      }
    } catch {
      toast.error("Failed to update passenger account status");
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === label ? null : prev));
    }, 2000);
  };

  const isSuspended = localStatus === "SUSPENDED";
  const userInitials = user.name
    ? user.name
        .split(" ")
        .filter(Boolean)
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "P";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg p-0 overflow-hidden rounded-2xl border border-border/80 shadow-2xl bg-background"
        closeButtonClassName="text-white/80 hover:text-white hover:bg-white/20 rounded-full top-5 right-5 z-10 transition-colors"
      >
        {/* Header Hero Banner with Deep Marine Indigo Palette */}
        <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-6 text-white relative border-b border-white/10">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              {/* User Avatar Badge */}
              <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-500 via-indigo-500 to-sky-400 text-white font-black text-lg shadow-md ring-2 ring-white/20">
                {userInitials}
              </div>

              {/* Title & Email */}
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-lg font-bold text-white tracking-tight truncate">
                    {user.name || "Unnamed Passenger"}
                  </DialogTitle>

                  {/* Role Tag (only shown if ADMIN or OPERATOR) */}
                  {user.role === "ADMIN" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/25 px-2 py-0.5 text-[10px] font-bold text-purple-200 border border-purple-400/30">
                      <Shield className="h-2.5 w-2.5" /> Admin
                    </span>
                  )}
                  {user.role === "OPERATOR" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/25 px-2 py-0.5 text-[10px] font-bold text-emerald-200 border border-emerald-400/30">
                      <Building2 className="h-2.5 w-2.5" /> Operator
                    </span>
                  )}
                </div>

                <DialogDescription className="text-white/75 text-xs truncate flex items-center gap-1.5">
                  <span>{user.email}</span>
                </DialogDescription>
              </div>
            </div>

            {/* Status Pill on Right */}
            <div className="mr-8 shrink-0">
              {isSuspended ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 px-3 py-1 text-xs font-bold text-rose-200 border border-rose-400/30 shadow-xs backdrop-blur-md">
                  <span className="h-2 w-2 rounded-full bg-rose-400" />
                  Suspended
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-200 border border-emerald-400/30 shadow-xs backdrop-blur-md">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Active
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {/* Section 1: Contact Information */}
          <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3 shadow-xs">
            <span className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground block">
              Contact Information
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Email Block */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium text-muted-foreground">Email Address</p>
                    <p className="text-xs font-semibold text-foreground truncate">{user.email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(user.email, "Email")}
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors cursor-pointer shrink-0"
                  title="Copy email"
                >
                  {copiedKey === "Email" ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>

              {/* Phone Block */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium text-muted-foreground">Phone Number</p>
                    <p className="text-xs font-semibold text-foreground truncate">
                      {user.phoneNumber || user.phone || "Not provided"}
                    </p>
                  </div>
                </div>
                {(user.phoneNumber || user.phone) && (
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(user.phoneNumber || user.phone || "", "Phone")
                    }
                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors cursor-pointer shrink-0"
                    title="Copy phone"
                  >
                    {copiedKey === "Phone" ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Account & Verification Details */}
          <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3 shadow-xs">
            <span className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground block">
              Account Verification & Status
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Verification Status */}
              <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/30 border border-border/50">
                <div
                  className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                    user.isEmailVerified
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {user.isEmailVerified ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground">Email Status</p>
                  <p
                    className={`text-xs font-semibold ${
                      user.isEmailVerified
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {user.isEmailVerified ? "Verified Account" : "Pending Verification"}
                  </p>
                </div>
              </div>

              {/* Registration Date */}
              <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/30 border border-border/50">
                <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground">Registered On</p>
                  <p className="text-xs font-semibold text-foreground">
                    {new Date(user.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric"
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Operator Business Profile (if applicable) */}
          {user.operatorProfile && (
            <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  Operator Business Profile
                </span>
                <Link
                  href={`/dashboard/admin/operators/${user.operatorProfile.id}`}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                >
                  View Provider Hub
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                <div>
                  <span className="text-[10px] text-muted-foreground">Company Name:</span>
                  <p className="font-bold text-foreground text-sm">{user.operatorProfile.companyName}</p>
                </div>

                <div>
                  <span className="text-[10px] text-muted-foreground">Contact Person:</span>
                  <p className="font-medium text-foreground">
                    {user.operatorProfile.contactPersonName || user.name || "N/A"}
                  </p>
                </div>

                {user.operatorProfile.businessAddress && (
                  <div className="sm:col-span-2">
                    <span className="text-[10px] text-muted-foreground">Address:</span>
                    <p className="text-muted-foreground">{user.operatorProfile.businessAddress}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section 4: System Audit / Activity Bar */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/20 border border-border/60 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span>
              Last profile update:{" "}
              <span className="font-medium text-foreground">
                {new Date(user.updatedAt).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "numeric",
                  hour12: true
                })}
              </span>
            </span>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-border/80">
            {isSuspended ? (
              <Button
                variant="outline"
                size="sm"
                disabled={updateStatusMutation.isPending}
                onClick={handleToggleStatus}
                className="h-9 gap-2 px-3.5 text-xs font-semibold text-emerald-600 border-emerald-300/80 hover:bg-emerald-50 hover:border-emerald-400 dark:border-emerald-900/60 dark:text-emerald-400 dark:hover:bg-emerald-950/40 cursor-pointer transition-all"
              >
                {updateStatusMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                )}
                <span>Activate Account</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                disabled={updateStatusMutation.isPending}
                onClick={handleToggleStatus}
                className="h-9 gap-2 px-3.5 text-xs font-semibold text-rose-600 border-rose-300/80 hover:bg-rose-50 hover:border-rose-400 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/40 cursor-pointer transition-all"
              >
                {updateStatusMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Ban className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                )}
                <span>Suspend Account</span>
              </Button>
            )}

            <Button
              variant="secondary"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-9 text-xs font-medium px-5 cursor-pointer shadow-xs hover:bg-muted"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
