"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signupAction } from "@/lib/auth/actions";

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type SignupFormData = z.infer<typeof signupSchema>;

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/app";
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [emailConfirmationRequired, setEmailConfirmationRequired] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: SignupFormData) => {
    setServerError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    const formData = new FormData();
    formData.append("email", data.email);
    formData.append("password", data.password);
    formData.append("confirmPassword", data.confirmPassword);

    const result = await signupAction(formData);

    if (result.success) {
      if (result.data?.emailConfirmationRequired) {
        setEmailConfirmationRequired(true);
        setSuccessMessage("Check your email to confirm your account. You'll be redirected after confirmation.");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
      reset();
    } else {
      setServerError(result.error);
    }
    setIsLoading(false);
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="font-display text-3xl font-semibold leading-[0.99] tracking-[-0.035em] text-text">
          Create your FORM account
        </h2>
        <p className="mt-2 text-text-secondary">
          Start building products from websites
        </p>
      </div>

      {serverError && (
        <div className="bg-danger/10 text-danger p-4 rounded-[8px] text-sm" role="alert">
          {serverError}
        </div>
      )}

      {successMessage && !emailConfirmationRequired && (
        <div className="bg-success/10 text-success p-4 rounded-[8px] text-sm" role="status">
          {successMessage}
        </div>
      )}

      {emailConfirmationRequired && (
        <div className="space-y-4 p-6 rounded-[12px] bg-accent/10 border border-accent/20">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent flex items-center justify-center">
              <svg className="w-4 h-4 text-accent-ink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="text-sm text-text">
              <p className="font-medium text-ink">Check your email</p>
              <p className="text-text-secondary mt-1">We have sent a confirmation link to your inbox. Please click the link to verify your email address.</p>
            </div>
          </div>
          <p className="text-xs text-text-secondary">
            Did not receive the email? Check your spam folder or{" "}
            <a href="/signup" className="text-accent hover:underline font-medium">
              sign up again
            </a>
          </p>
        </div>
      )}

      {!emailConfirmationRequired && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div>
            <Label htmlFor="email" className="block mb-2">
              Email address
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
              disabled={isLoading}
              {...register("email")}
            />
            {errors.email && (
              <p id="email-error" className="mt-1.5 text-sm text-danger" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="password" className="block mb-2">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
              disabled={isLoading}
              {...register("password")}
            />
            {errors.password && (
              <p id="password-error" className="mt-1.5 text-sm text-danger" role="alert">
                {errors.password.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="confirmPassword" className="block mb-2">
              Confirm password
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              aria-invalid={!!errors.confirmPassword}
              aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
              disabled={isLoading}
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p id="confirmPassword-error" className="mt-1.5 text-sm text-danger" role="alert">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <div className="text-sm text-text-secondary space-y-1">
            <p>Password must be at least 8 characters.</p>
            <p>Use a mix of letters, numbers, and symbols for better security.</p>
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? "Creating account…" : "Sign up"}
          </Button>
        </form>
      )}

      {!emailConfirmationRequired && (
        <div className="text-center text-sm">
          <p className="text-text-secondary">
            Already have an account?{" "}
            <a href="/login" className="text-accent hover:underline font-medium">
              Sign in
            </a>
          </p>
        </div>
      )}
    </div>
  );
}

import { useState } from "react";

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-ink border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Loading…</p>
        </div>
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}