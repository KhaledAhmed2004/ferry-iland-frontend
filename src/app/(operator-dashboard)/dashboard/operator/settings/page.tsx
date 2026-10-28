"use client";

import * as React from "react";
import { Building2 } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Input,
  Label
} from "@/ui";

export default function OperatorSettingsPage() {
  // Operator info state
  const [operatorInfo, setOperatorInfo] = React.useState({
    operatorName: "Oceanic Ferries Ltd.",
    contactEmail: "operations@oceanicferries.com",
    businessAddress: "120 Harbor View Dr, Seattle, WA 98104"
  });
  const [isSavingOperator, setIsSavingOperator] = React.useState(false);

  const handleSaveOperator = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingOperator(true);
    setTimeout(() => {
      setIsSavingOperator(false);
      toast.success("Operator information saved successfully!");
    }, 400);
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
                disabled={isSavingOperator}
                className="h-9 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors"
              >
                {isSavingOperator ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
