"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPasswordAction } from "@/lib/auth/actions";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setServerError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    const formData = new FormData();
    formData.append("email", data.email);

    const result = await forgotPasswordAction(formData);

    if (result.success) {
      setSuccessMessage(result.data?.message || "If your email exists in our system, you'll receive a password reset link.");
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
          Reset your password
        </h2>
        <p className="mt-2 text-text-secondary">
          Enter your email address to receive a reset link
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

        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={isLoading}
        >
          {isLoading ? "Sending…" : "Send reset link"}
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