"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, KeyRound, Loader2, Mail } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { forgotPasswordSchema, type ForgotPasswordInput } from "@/schemas";
import { useForgotPasswordMutation } from "@/hooks";
import { BrandLogo } from "@/widgets";
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input
} from "@/ui";

export function ForgotPasswordForm() {
  const router = useRouter();
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const forgotMutation = useForgotPasswordMutation();

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: ""
    }
  });

  const onSubmit = (values: ForgotPasswordInput) => {
    forgotMutation.mutate(values, {
      onSuccess: () => {
        setSubmittedEmail(values.email);
      }
    });
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
            Forgot Password
          </h2>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Enter your registered email address and we&apos;ll send you a password reset token.
          </p>
        </div>
      </div>

      {submittedEmail ? (
        /* Success State Banner */
        <div className="border-border/60 bg-muted/30 space-y-5 rounded-2xl border p-5">
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-foreground text-sm font-bold">Check your email</h3>
              <p className="text-muted-foreground text-xs leading-relaxed">
                If an account exists for <span className="font-semibold text-foreground">{submittedEmail}</span>,
                you will receive a 64-character verification token shortly.
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <Button
              type="button"
              className="h-11 w-full rounded-xl text-xs font-bold shadow-md transition-all hover:shadow-lg"
              onClick={() => router.push(`/reset-password?email=${encodeURIComponent(submittedEmail)}`)}
            >
              <KeyRound className="mr-2 h-4 w-4" />
              Enter Reset Token & Set Password
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            <Button
              type="button"
              variant="outline"
              className="h-10 w-full rounded-xl text-xs font-semibold"
              onClick={() => setSubmittedEmail(null)}
            >
              Try a different email
            </Button>
          </div>
        </div>
      ) : (
        /* Main Request Form */
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-foreground text-xs font-bold">Email Address</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="text-muted-foreground pointer-events-none absolute top-3.5 left-3.5 h-4 w-4" />
                      <Input
                        type="email"
                        placeholder="your.email@example.com"
                        autoComplete="email"
                        className="border-input bg-card placeholder:text-muted-foreground/60 focus-visible:ring-primary h-11 rounded-xl pl-10 text-xs font-medium"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="h-12 w-full rounded-xl text-sm font-bold shadow-md transition-all hover:shadow-lg"
              disabled={forgotMutation.isPending}
            >
              {forgotMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Reset Token...
                </>
              ) : (
                <>
                  Send Reset Token
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </Form>
      )}

      {/* Back to Sign In Link */}
      <div className="text-muted-foreground pt-2 text-center text-xs">
        Remembered your credentials?{" "}
        <Link href="/login" className="text-primary font-bold inline-flex items-center gap-1 hover:underline">
          <ArrowLeft className="h-3 w-3" /> Back to Sign In
        </Link>
      </div>
    </div>
  );
}

