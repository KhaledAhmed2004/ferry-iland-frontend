"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Loader2,
  Mail,
  Phone,
  Ship,
  User
} from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { cn } from "@/lib/utils";
import { useSignupMutation } from "@/hooks";
import { signupMultiStepSchema, type SignupMultiStepInput } from "@/schemas";
import {
  Badge,
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  PasswordInput,
  Stepper,
  StepperContent,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperPanel,
  StepperSeparator,
  StepperTitle,
  StepperTrigger
} from "@/ui";

type UserRole = "passenger" | "operator";

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole: UserRole =
    searchParams.get("role") === "operator" ? "operator" : "passenger";

  const [role, setRole] = useState<UserRole>(initialRole);
  const [currentStep, setCurrentStep] = useState<"info" | "contact" | "security">("info");
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  const signupMutation = useSignupMutation();

  const form = useForm<SignupMultiStepInput>({
    resolver: zodResolver(signupMultiStepSchema),
    defaultValues: {
      role: initialRole,
      companyName: "",
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: ""
    },
    mode: "onTouched"
  });

  const steps =
    role === "operator"
      ? [
          { id: "info", title: "Company", description: "Company & Contact Name" },
          { id: "contact", title: "Contact", description: "Email & Phone" },
          { id: "security", title: "Security", description: "Set Password" }
        ]
      : [
          { id: "info", title: "Personal", description: "Your Full Name" },
          { id: "contact", title: "Contact", description: "Email & Phone" },
          { id: "security", title: "Security", description: "Set Password" }
        ];

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    form.setValue("role", newRole);
    setCurrentStep("info");
    setCompletedSteps({});
  };

  const handleNextFromInfo = async () => {
    const fieldsToValidate =
      role === "operator"
        ? (["companyName", "name"] as const)
        : (["name"] as const);

    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      setCompletedSteps((prev) => ({ ...prev, info: true }));
      setCurrentStep("contact");
    }
  };

  const handleNextFromContact = async () => {
    const isValid = await form.trigger(["email", "phone"]);
    if (isValid) {
      setCompletedSteps((prev) => ({ ...prev, contact: true }));
      setCurrentStep("security");
    }
  };

  const onSubmit = (values: SignupMultiStepInput) => {
    const roleUpper = values.role === "operator" ? "OPERATOR" : "USER";

    signupMutation.mutate(
      {
        role: roleUpper,
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
        phoneNumber: values.phone.trim(),
        phone: values.phone.trim(),
        companyName: values.role === "operator" ? values.companyName?.trim() : undefined,
        contactPersonName: values.role === "operator" ? values.name.trim() : undefined
      },
      {
        onSuccess: () => {
          setIsSubmitted(true);
          setCompletedSteps((prev) => ({ ...prev, security: true }));
          setTimeout(() => {
            router.push(
              `/verify-email?email=${encodeURIComponent(values.email.trim())}&role=${values.role}`
            );
          }, 1000);
        }
      }
    );
  };

  return (
    <div className="w-full space-y-6">
      {/* Top Header */}
      <div className="space-y-4">
        {/* Role Pill Badge */}
        <Badge
          variant="outline"
          className="border-primary/30 bg-primary/10 text-primary w-fit text-[11px] font-bold tracking-wider uppercase"
        >
          <span className="bg-primary mr-1.5 inline-block h-2 w-2 rounded-full" />
          {role === "operator" ? "FERRY OPERATOR" : "PASSENGER"}
        </Badge>

        {/* Role Toggle Switcher */}
        <div className="border-border bg-muted/60 flex rounded-xl border p-1">
          <button
            type="button"
            onClick={() => handleRoleChange("passenger")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all ${
              role === "passenger"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <User className="h-3.5 w-3.5" />
            Passenger
          </button>
          <button
            type="button"
            onClick={() => handleRoleChange("operator")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all ${
              role === "operator"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Ship className="h-3.5 w-3.5" />
            Ferry Operator
          </button>
        </div>

        {/* Titles */}
        <div className="space-y-1">
          <h2 className="text-foreground text-2xl font-black tracking-tight sm:text-3xl">
            {role === "operator" ? "Create your operator account" : "Create your passenger account"}
          </h2>
          <p className="text-muted-foreground text-xs sm:text-sm">
            {role === "operator"
              ? "Register your ferry company to start managing your maritime services on IslandHop."
              : "Register to easily book ferries, receive digital tickets, and travel across the islands."}
          </p>
        </div>
      </div>

      {/* Stepper Progress */}
      <Stepper
        steps={steps}
        value={currentStep}
        onValueChange={(v) => {
          if (isSubmitted) return;
          if (completedSteps[v] || v === currentStep) {
            setCurrentStep(v as "info" | "contact" | "security");
          }
        }}
        className="flex flex-col gap-6"
        orientation="horizontal"
      >
        <StepperNav>
          {steps.map((step, index) => {
            const isDone = !!completedSteps[step.id];
            const isAllowed = isDone || step.id === currentStep;

            return (
              <StepperItem key={step.id} stepId={step.id} className="relative flex-1">
                <StepperTrigger
                  className={cn(
                    "flex flex-col gap-2",
                    !isAllowed || isSubmitted ? "pointer-events-none opacity-60" : ""
                  )}
                  aria-disabled={!isAllowed || isSubmitted}
                >
                  <StepperIndicator
                    className={
                      isDone
                        ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                        : ""
                    }
                  >
                    {index + 1}
                  </StepperIndicator>
                  <StepperTitle className="text-xs font-bold">{step.title}</StepperTitle>
                </StepperTrigger>
                {steps.length > index + 1 && (
                  <StepperSeparator
                    className={cn(
                      "absolute top-2.5 right-[calc(-50%+16px)] left-[calc(50%+16px)]",
                      isDone ? "bg-emerald-500/50" : ""
                    )}
                  />
                )}
              </StepperItem>
            );
          })}
        </StepperNav>

        {/* Unified Shadcn Form Container */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="w-full">
            <StepperPanel className="w-full">
              {/* Step 1: Info */}
              <StepperContent value="info" className="space-y-4 pt-2">
                {role === "operator" && (
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-foreground text-xs font-bold">
                          Company Name
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Building2 className="text-muted-foreground pointer-events-none absolute top-3.5 left-3.5 h-4 w-4" />
                            <Input
                              placeholder="e.g. OceanLink Ferries"
                              className="border-input bg-card placeholder:text-muted-foreground/60 focus-visible:ring-primary h-11 rounded-xl pl-10 text-xs font-medium"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-foreground text-xs font-bold">
                        {role === "operator" ? "Contact Person Name" : "Full Name"}
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="text-muted-foreground pointer-events-none absolute top-3.5 left-3.5 h-4 w-4" />
                          <Input
                            placeholder={role === "operator" ? "e.g. Captain Ahmed" : "e.g. Jane Doe"}
                            className="border-input bg-card placeholder:text-muted-foreground/60 focus-visible:ring-primary h-11 rounded-xl pl-10 text-xs font-medium"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end pt-2">
                  <Button
                    type="button"
                    onClick={handleNextFromInfo}
                    className="h-11 rounded-xl px-6 font-bold shadow-sm"
                  >
                    Next Step <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </div>
              </StepperContent>

              {/* Step 2: Contact */}
              <StepperContent value="contact" className="space-y-4 pt-2">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-foreground text-xs font-bold">
                        {role === "operator" ? "Company Email Address" : "Email Address"}
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="text-muted-foreground pointer-events-none absolute top-3.5 left-3.5 h-4 w-4" />
                          <Input
                            type="email"
                            placeholder={
                              role === "operator" ? "operations@company.com" : "jane@example.com"
                            }
                            className="border-input bg-card placeholder:text-muted-foreground/60 focus-visible:ring-primary h-11 rounded-xl pl-10 text-xs font-medium"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-foreground text-xs font-bold">Phone Number</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="text-muted-foreground pointer-events-none absolute top-3.5 left-3.5 h-4 w-4" />
                          <Input
                            type="tel"
                            placeholder="+8801712345678"
                            className="border-input bg-card placeholder:text-muted-foreground/60 focus-visible:ring-primary h-11 rounded-xl pl-10 text-xs font-medium"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-between gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep("info")}
                    className="h-11 rounded-xl px-5 font-semibold"
                  >
                    <ArrowLeft className="mr-1.5 h-4 w-4" /> Previous
                  </Button>
                  <Button
                    type="button"
                    onClick={handleNextFromContact}
                    className="h-11 rounded-xl px-6 font-bold shadow-sm"
                  >
                    Next Step <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </div>
              </StepperContent>

              {/* Step 3: Security */}
              <StepperContent value="security" className="space-y-4 pt-2">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-foreground text-xs font-bold">Create Password</FormLabel>
                      <FormControl>
                        <PasswordInput
                          placeholder="••••••••"
                          className="border-input bg-card placeholder:text-muted-foreground/60 focus-visible:ring-primary h-11 rounded-xl text-xs font-medium"
                          {...field}
                        />
                      </FormControl>
                      <p className="text-muted-foreground pt-1 text-[11px]">
                        Must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special symbol.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-foreground text-xs font-bold">Confirm Password</FormLabel>
                      <FormControl>
                        <PasswordInput
                          placeholder="••••••••"
                          className="border-input bg-card placeholder:text-muted-foreground/60 focus-visible:ring-primary h-11 rounded-xl text-xs font-medium"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-between gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep("contact")}
                    disabled={signupMutation.isPending}
                    className="h-11 rounded-xl px-5 font-semibold"
                  >
                    <ArrowLeft className="mr-1.5 h-4 w-4" /> Previous
                  </Button>
                  <Button
                    type="submit"
                    className="h-11 rounded-xl px-6 font-bold shadow-md transition-all hover:shadow-lg"
                    disabled={signupMutation.isPending}
                  >
                    {signupMutation.isPending ? (
                      <>
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : isSubmitted ? (
                      <>
                        <CheckCircle2 className="mr-1.5 h-4 w-4 text-emerald-400" />
                        Success!
                      </>
                    ) : (
                      <>
                        Complete Registration <ArrowRight className="ml-1.5 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </StepperContent>
            </StepperPanel>
          </form>
        </Form>
      </Stepper>

      {/* Switch to Sign In */}
      <div className="text-muted-foreground pt-1 text-center text-xs">
        Already have an account?{" "}
        <Link href={`/login?role=${role}`} className="text-primary font-bold hover:underline">
          Sign In
        </Link>
      </div>
    </div>
  );
}
