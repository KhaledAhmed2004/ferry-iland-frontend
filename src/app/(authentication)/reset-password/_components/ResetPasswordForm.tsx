"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, KeyRound, Loader2, Lock, Mail } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { resetPasswordSchema, type ResetPasswordInput } from "@/schemas";
import { useResetPasswordMutation } from "@/hooks";
import { BrandLogo } from "@/widgets";
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  PasswordInput
} from "@/ui";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlToken = searchParams.get("token") || "";
  const urlEmail = searchParams.get("email") || "";

  const [email, setEmail] = useState(() => urlEmail);
  const [isSuccess, setIsSuccess] = useState(false);

  const resetMutation = useResetPasswordMutation();

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: urlToken,
      newPassword: "",
      confirmPassword: ""
    }
  });

  const onSubmit = (values: ResetPasswordInput) => {
    resetMutation.mutate(
      {
        token: values.token,
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword,
        email: email || undefined
      },
      {
        onSuccess: () => {
          setIsSuccess(true);
        }
      }
    );
  };

  return (
    <div className="w-full space-y-6">
      {/* Top Header & Brand */}
      <div className="space-y-4">
        {/* Brand for Desktop */}
        <div className="hidden lg:block">
          <BrandLogo size="md" subtitle="SECURE PORTAL" />
        </div>

        {/* Titles */}
        <div className="space-y-1">
          <h2 className="text-foreground text-2xl font-black tracking-tight sm:text-3xl">
            Reset Password
          </h2>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Enter your reset token and choose a strong new password for your account.
          </p>
        </div>
      </div>

      {isSuccess ? (
        /* Success State Banner */
        <div className="border-border/60 bg-muted/30 space-y-5 rounded-2xl border p-5">
          <div className="flex items-start gap-3">
            <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-foreground text-sm font-bold">Password reset successful</h3>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Your credentials have been securely updated and previous sessions invalidated. You can now sign in with your new password.
              </p>
            </div>
          </div>

          <Button
            type="button"
            className="h-11 w-full rounded-xl text-xs font-bold shadow-md transition-all hover:shadow-lg"
            onClick={() => router.push(`/login${email ? `?email=${encodeURIComponent(email)}` : ""}`)}
          >
            Sign In with New Password
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      ) : (
        /* Main Reset Form */
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Optional Email Field for reference */}
            <div className="space-y-1.5">
              <FormLabel className="text-foreground text-xs font-bold">Account Email (Optional)</FormLabel>
              <div className="relative">
                <Mail className="text-muted-foreground pointer-events-none absolute top-3.5 left-3.5 h-4 w-4" />
                <Input
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-input bg-card placeholder:text-muted-foreground/60 focus-visible:ring-primary h-11 rounded-xl pl-10 text-xs font-medium"
                />
              </div>
            </div>

            {/* Reset Token Field */}
            <FormField
              control={form.control}
              name="token"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-foreground text-xs font-bold">Reset Token</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <KeyRound className="text-muted-foreground pointer-events-none absolute top-3.5 left-3.5 h-4 w-4" />
                      <Input
                        type="text"
                        placeholder="Paste verification token received in email"
                        autoComplete="off"
                        className="border-input bg-card placeholder:text-muted-foreground/60 focus-visible:ring-primary h-11 rounded-xl pl-10 font-mono text-xs font-medium"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* New Password Field */}
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-foreground text-xs font-bold">New Password</FormLabel>
                  <FormControl>
                    <PasswordInput
                      placeholder="At least 8 chars, uppercase, number & symbol"
                      autoComplete="new-password"
                      className="border-input bg-card placeholder:text-muted-foreground/60 focus-visible:ring-primary h-11 rounded-xl text-xs font-medium"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Confirm New Password Field */}
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-foreground text-xs font-bold">Confirm New Password</FormLabel>
                  <FormControl>
                    <PasswordInput
                      placeholder="Re-enter your new password"
                      autoComplete="new-password"
                      className="border-input bg-card placeholder:text-muted-foreground/60 focus-visible:ring-primary h-11 rounded-xl text-xs font-medium"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="h-12 w-full rounded-xl text-sm font-bold shadow-md transition-all hover:shadow-lg"
              disabled={resetMutation.isPending}
            >
              {resetMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating Password...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Reset Password
                </>
              )}
            </Button>
          </form>
        </Form>
      )}

      {/* Switch to Sign In / Forgot Password */}
      <div className="text-muted-foreground flex items-center justify-between pt-2 text-xs">
        <Link href="/login" className="text-primary font-bold inline-flex items-center gap-1 hover:underline">
          <ArrowLeft className="h-3 w-3" /> Back to Sign In
        </Link>
        <Link href="/forgot-password" className="text-muted-foreground hover:text-foreground font-medium hover:underline">
          Resend Token
        </Link>
      </div>
    </div>
  );
}

