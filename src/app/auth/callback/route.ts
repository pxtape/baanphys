import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getSafeRedirectPath } from "@/lib/auth-redirect";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const destination = new URL(getSafeRedirectPath(requestUrl.searchParams.get("next")), requestUrl.origin);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(destination);
  } else if (tokenHash && isEmailOtpType(type)) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(destination);
  }

  const login = new URL("/login", requestUrl.origin);
  login.searchParams.set("error", "auth_callback_failed");
  return NextResponse.redirect(login);
}

function isEmailOtpType(type: string | null): type is EmailOtpType {
  return type === "email" || type === "signup" || type === "magiclink" || type === "recovery" || type === "invite" || type === "email_change";
}
