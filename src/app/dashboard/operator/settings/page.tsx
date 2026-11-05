"use client";

import * as React from "react";
import { Building2, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage, Button, Input, Label } from "@/ui";

import {
  OPERATOR_LOGO_MAX_MB,
  OPERATOR_LOGO_TYPES,
  useOperatorLogoMutation,
  useOperatorSettingsQuery,
  useUpdateOperatorSettingsMutation
} from "@/hooks/use-operator";

/** Company logo: preview, upload (saved right away) and remove. */
function CompanyLogoField({ logoUrl, companyName }: { logoUrl?: string | null; companyName: string }) {
  const logoMutation = useOperatorLogoMutation();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const pending = logoMutation.isPending;

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];
    // Clearing the input lets the same file be picked again. Do it only after the upload:
    // clearing it first empties the File's contents before axios reads them.
    const resetInput = () => {
      input.value = "";
    };
    if (!file) return;
    if (!OPERATOR_LOGO_TYPES.includes(file.type)) {
      toast.error("Logo must be a PNG, JPG or WebP image.");
      resetInput();
      return;
    }
    if (file.size > OPERATOR_LOGO_MAX_MB * 1024 * 1024) {
      toast.error(`Logo must be ${OPERATOR_LOGO_MAX_MB} MB or smaller.`);
      resetInput();
      return;
    }
    logoMutation.mutate({ file }, { onSettled: resetInput });
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Avatar className="size-16 rounded-xl border">
        {logoUrl && (
          <AvatarImage src={logoUrl} alt={`${companyName || "Company"} logo`} className="object-cover" />
        )}
        <AvatarFallback className="rounded-xl bg-emerald-50 text-emerald-600">
          <Building2 className="size-7" />
        </AvatarFallback>
      </Avatar>
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Company Logo</p>
        <p className="text-muted-foreground text-xs">
          PNG, JPG or WebP, up to {OPERATOR_LOGO_MAX_MB} MB. Shown to admins in the operators list.
        </p>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={OPERATOR_LOGO_TYPES.join(",")}
            className="hidden"
            onChange={handleFile}
            aria-label="Upload company logo"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => inputRef.current?.click()}
          >
            {pending ? <Loader2 className="animate-spin" /> : <Upload />}
            {logoUrl ? "Change logo" : "Upload logo"}
          </Button>
          {logoUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => logoMutation.mutate({ remove: true })}
              className="text-rose-600 hover:text-rose-700"
            >
              <Trash2 />
              Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OperatorSettingsPage() {
  const { data: operatorSettings, isLoading } = useOperatorSettingsQuery();
  const updateSettingsMutation = useUpdateOperatorSettingsMutation();

  // Operator info state
  const [operatorInfo, setOperatorInfo] = React.useState({
    operatorName: "",
    contactEmail: "",
    businessAddress: ""
  });

  React.useEffect(() => {
    if (operatorSettings) {
      setOperatorInfo({
        operatorName: operatorSettings.companyName || "",
        contactEmail: operatorSettings.contactEmail || operatorSettings.user?.email || "",
        businessAddress: operatorSettings.businessAddress || ""
      });
    }
  }, [operatorSettings]);

  const handleSaveOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettingsMutation.mutateAsync({
      companyName: operatorInfo.operatorName.trim(),
      contactEmail: operatorInfo.contactEmail.trim(),
      businessAddress: operatorInfo.businessAddress.trim()
    });
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* 1. Operator Information Card */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        {/* Soft top-right decorative shape */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-blue-100/50 blur-xl dark:bg-blue-900/20"
        />

        <div className="relative z-10">
          <div className="flex items-center gap-2.5 text-blue-600 dark:text-blue-400">
            <Building2 className="h-5 w-5" />
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Operator Information
            </h2>
          </div>

          <div className="mt-6">
            <CompanyLogoField
              logoUrl={operatorSettings?.logoUrl}
              companyName={operatorSettings?.companyName ?? ""}
            />
          </div>

          <form onSubmit={handleSaveOperator} className="mt-6 space-y-5">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="operatorName" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Operator Name
                </Label>
                <Input
                  id="operatorName"
                  value={operatorInfo.operatorName}
                  onChange={(e) => setOperatorInfo((prev) => ({ ...prev, operatorName: e.target.value }))}
                  required
                  className="h-10 rounded-lg border-slate-200 bg-white text-xs sm:text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactEmail" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Contact Email
                </Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={operatorInfo.contactEmail}
                  onChange={(e) => setOperatorInfo((prev) => ({ ...prev, contactEmail: e.target.value }))}
                  required
                  className="h-10 rounded-lg border-slate-200 bg-white text-xs sm:text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessAddress" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Business Address
              </Label>
              <Input
                id="businessAddress"
                value={operatorInfo.businessAddress}
                onChange={(e) => setOperatorInfo((prev) => ({ ...prev, businessAddress: e.target.value }))}
                required
                className="h-10 rounded-lg border-slate-200 bg-white text-xs sm:text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={updateSettingsMutation.isPending}
                className="h-9 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors"
              >
                {updateSettingsMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
