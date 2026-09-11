"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "@/lib/auth/actions";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/app";
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    setIsLoading(true);

    const formData = new FormData();
    formData.append("email", data.email);
    formData.append("password", data.password);

    const result = await loginAction(formData);

    if (result.success) {
      router.push(callbackUrl);
      router.refresh();
    } else {
      setServerError(result.error);
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="font-display text-3xl font-semibold leading-[0.99] tracking-[-0.035em] text-text">
          Sign in to FORM
        </h2>
        <p className="mt-2 text-text-secondary">
          Access your projects and build from websites
        </p>
      </div>

      {serverError && (
        <div className="bg-danger/10 text-danger p-4 rounded-[8px] text-sm" role="alert">
          {serverError}
        </div>
      )}

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
            autoComplete="current-password"
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

        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={isLoading}
        >
          {isLoading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="text-center text-sm space-y-3">
        <p className="text-text-secondary">
          Do not have an account?{" "}
          <a href="/signup" className="text-accent hover:underline font-medium">
            Sign up
          </a>
        </p>
        <p className="text-text-secondary">
          <a href="/forgot-password" className="text-accent hover:underline font-medium">
            Forgot password?
          </a>
        </p>
      </div>
    </div>
  );
}

import { useState } from "react";

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-ink border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Loading…</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}