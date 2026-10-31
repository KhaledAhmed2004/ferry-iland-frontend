"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Clock, Loader2, Percent, RefreshCw, Wallet } from "lucide-react";
import { useForm } from "react-hook-form";

import { useAdminSettingsQuery, useUpdatePaymentSettingsMutation } from "@/hooks/use-admin";
import { paymentSettingsSchema, type PaymentSettingsInput } from "@/schemas";
import type { IUpdatePaymentSettingsPayload, PayoutSchedule } from "@/types";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/ui";

const PAYOUT_SCHEDULE_OPTIONS: { value: PayoutSchedule; label: string }[] = [
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" }
];

/** Turns an empty number input into NaN so zod reports "Enter a ..." instead of saving 0. */
const toNumber = (value: string) => (value === "" ? Number.NaN : Number(value));

/**
 * Spec 0001 (AC-9): platform commission, payout schedule, and seat hold minutes,
 * read from `GET /admin/settings` and saved through `PATCH /admin/settings/commission`.
 */
export function PaymentSettingsCard() {
  const { data: settings, isLoading, isError, error, refetch, isFetching } = useAdminSettingsQuery();
  const updateSettings = useUpdatePaymentSettingsMutation();

  const form = useForm<PaymentSettingsInput>({
    resolver: zodResolver(paymentSettingsSchema),
    defaultValues: { commissionRate: 0, payoutSchedule: "WEEKLY", seatHoldMinutes: 15 }
  });

  // Load the saved values into the form once they arrive (and after each save).
  React.useEffect(() => {
    if (settings) {
      form.reset({
        commissionRate: settings.commissionRate,
        payoutSchedule: settings.payoutSchedule,
        seatHoldMinutes: settings.seatHoldMinutes
      });
    }
  }, [settings, form]);

  const onSubmit = (values: PaymentSettingsInput) => {
    if (!settings) return;

    // Send only what changed, so a save never overwrites a field you didn't touch.
    const payload: IUpdatePaymentSettingsPayload = {};
    if (values.commissionRate !== settings.commissionRate) payload.rate = values.commissionRate;
    if (values.payoutSchedule !== settings.payoutSchedule) payload.schedule = values.payoutSchedule;
    if (values.seatHoldMinutes !== settings.seatHoldMinutes) payload.seatHoldMinutes = values.seatHoldMinutes;

    if (Object.keys(payload).length === 0) return;
    updateSettings.mutate(payload);
  };

  if (isLoading) {
    return (
      <Card className="border-border/80 bg-card max-w-4xl shadow-xs">
        <CardContent className="flex items-center gap-3 py-10 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading payment settings…
        </CardContent>
      </Card>
    );
  }

  if (isError || !settings) {
    return (
      <Card className="border-destructive/40 bg-card max-w-4xl shadow-xs">
        <CardContent className="flex flex-col gap-3 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
            <div>
              <p className="text-sm font-semibold text-foreground">Couldn&apos;t load payment settings</p>
              <p className="text-xs text-muted-foreground">
                {(error as Error | null)?.message || "The settings service did not respond."}
              </p>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isDirty = form.formState.isDirty;
  const isSaving = updateSettings.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-4xl space-y-6" noValidate>
        <Card className="border-border/80 bg-card shadow-xs">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-foreground">Payments & Seat Holds</CardTitle>
                <CardDescription className="text-xs">
                  Platform commission, operator payout schedule, and how long unpaid bookings hold their seats.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="commissionRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-foreground">Platform Commission (%)</FormLabel>
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        min={0}
                        max={100}
                        className="h-10 bg-background pl-9 text-xs font-medium"
                        value={Number.isNaN(field.value) ? "" : field.value}
                        onChange={(e) => field.onChange(toNumber(e.target.value))}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                  </div>
                  <FormDescription className="text-[11px]">
                    Applies to new bookings only. Existing payments keep the rate they were charged at.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="seatHoldMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-foreground">Seat Hold (minutes)</FormLabel>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="numeric"
                        step={1}
                        min={1}
                        max={60}
                        className="h-10 bg-background pl-9 text-xs font-medium"
                        value={Number.isNaN(field.value) ? "" : field.value}
                        onChange={(e) => field.onChange(toNumber(e.target.value))}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                  </div>
                  <FormDescription className="text-[11px]">
                    How long a booking waiting for payment keeps its seats (1 to 60).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="payoutSchedule"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-foreground">Operator Payout Schedule</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="h-10 bg-background text-xs font-medium">
                        <SelectValue placeholder="Choose a schedule" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PAYOUT_SCHEDULE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value} className="text-xs">
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>

          <CardFooter className="flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] text-muted-foreground">
              Last updated {new Date(settings.updatedAt).toLocaleString()}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!isDirty || isSaving}
                onClick={() =>
                  form.reset({
                    commissionRate: settings.commissionRate,
                    payoutSchedule: settings.payoutSchedule,
                    seatHoldMinutes: settings.seatHoldMinutes
                  })
                }
              >
                Discard
              </Button>
              <Button type="submit" size="sm" disabled={!isDirty || isSaving}>
                {isSaving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                Save Payment Settings
              </Button>
            </div>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
