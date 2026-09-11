"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

const resetPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

function verifyResetTokens(accessToken: string, refreshToken: string): Promise<{ valid: boolean; error?: string }> {
  const supabase = createClient();
  return supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  }).then(({ error }) => ({
    valid: !error,
    error: error?.message,
  }));
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasValidTokens, setHasValidTokens] = useState(false);
  const [checkingTokens, setCheckingTokens] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const accessToken = searchParams.get("access_token");
  const refreshToken = searchParams.get("refresh_token");
  const tokensPresent = !!accessToken && !!refreshToken;

  useEffect(() => {
    if (!tokensPresent) {
      return;
    }

    let cancelled = false;

    verifyResetTokens(accessToken!, refreshToken!).then(({ valid }) => {
      if (cancelled) return;
      if (!valid) {
        setHasValidTokens(false);
        setServerError("Invalid or expired reset link. Please request a new password reset.");
      } else {
        setHasValidTokens(true);
      }
      setCheckingTokens(false);
    });

    return () => {
      cancelled = true;
    };
  }, [accessToken, refreshToken, tokensPresent]);

  // Handle case where tokens are not present - render immediately without effect
  const showInvalidTokenState = !tokensPresent && !checkingTokens;

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!hasValidTokens) return;

    setServerError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    const supabase = createClient();

    const { error } = await supabase.auth.updateUser({
      password: data.password,
    });

    if (error) {
      setServerError(error.message);
      setIsLoading(false);
      return;
    }

    setSuccessMessage("Password has been reset successfully. Redirecting to sign in…");
    reset();

    setTimeout(() => {
      router.push("/login");
      router.refresh();
    }, 2000);
  };

  if (checkingTokens) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-ink border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Verifying reset link…</p>
        </div>
      </div>
    );
  }

  if (!hasValidTokens || showInvalidTokenState) {
    if (showInvalidTokenState && !serverError) {
      setServerError("Invalid or expired reset link. Please request a new password reset.");
    }
    return (
      <div className="space-y-8 text-center">
        <div className="p-6 rounded-[12px] bg-danger/10 border border-danger/20">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-danger/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <h2 className="font-display text-2xl font-semibold text-text">Invalid link</h2>
          <p className="mt-2 text-text-secondary">
            This password reset link is invalid or has expired.
          </p>
        </div>
        <Button variant="outline" asChild>
          <a href="/forgot-password">Request a new reset link</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="font-display text-3xl font-semibold leading-[0.99] tracking-[-0.035em] text-text">
          Set new password
        </h2>
        <p className="mt-2 text-text-secondary">
          Enter a new password for your account
        </p>
      </div>

      {serverError && (
        <div className="bg-danger/10 text-danger p-4 rounded-[8px] text-sm" role="alert">
          {serverError}
        </div>
      )}

      {successMessage && (
        <div className="bg-success/10 text-success p-4 rounded-[8px] text-sm" role="status">
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div>
          <Label htmlFor="password" className="block mb-2">
            New password
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
            Confirm new password
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

        <div className="text-sm text-text-secondary">
          Password must be at least 8 characters.
        </div>

        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={isLoading}
        >
          {isLoading ? "Resetting password…" : "Reset password"}
        </Button>
      </form>

      <div className="text-center text-sm">
        <p className="text-text-secondary">
          <a href="/login" className="text-accent hover:underline font-medium">
            Back to sign in
          </a>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-ink border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Loading…</p>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}