import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// This is the callback route for Supabase Auth
// Handles email confirmation, password recovery, and OAuth callbacks
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");
  const type = requestUrl.searchParams.get("type");
  const next = requestUrl.searchParams.get("next") || "/app";

  // Handle auth errors (e.g., expired link, invalid token)
  if (error) {
    const errorUrl = new URL("/login", requestUrl.origin);
    errorUrl.searchParams.set("error", error);
    if (errorDescription) {
      errorUrl.searchParams.set("error_description", errorDescription);
    }
    return NextResponse.redirect(errorUrl);
  }

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      const errorUrl = new URL("/login", requestUrl.origin);
      errorUrl.searchParams.set("error", exchangeError.message);
      return NextResponse.redirect(errorUrl);
    }
  }

  // Determine redirect URL based on auth flow type
  let redirectUrl = next;
  
  // For password recovery, redirect to reset-password page
  if (type === "recovery") {
    redirectUrl = "/reset-password";
  }
  
  // For email confirmation, redirect to app (user will be signed in)
  // The confirm flow doesn't need special handling beyond the session exchange

  const url = requestUrl.origin + redirectUrl;
  return NextResponse.redirect(url);
}