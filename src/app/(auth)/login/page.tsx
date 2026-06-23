"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Logo from "@/components/Logo";
import MicrosoftButton from "@/components/MicrosoftButton";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/dashboard";
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);

    if (res?.ok && !res.error) {
      router.push(callbackUrl);
      router.refresh();
    } else {
      setError("Incorrect email or password.");
    }
  }

  return (
    <div className="auth-card">
      <Link href="/" aria-label="Home" className="auth-logo">
        <Logo height={64} className="form-logo" />
      </Link>
      <h2>Welcome back</h2>
      <p className="auth-subtitle">Sign in to your Togo Insight account</p>

      <MicrosoftButton callbackUrl={callbackUrl} dividerText="or continue with email" />

      <form className="auth-form" onSubmit={handleSubmit}>
        {error && <div className="form-error">{error}</div>}
        <div className="field">
          <label htmlFor="email"><i className="fas fa-envelope" /> Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" placeholder="you@company.com" />
        </div>
        <div className="field">
          <label htmlFor="password"><i className="fas fa-lock" /> Password</label>
          <input id="password" name="password" type="password" required autoComplete="current-password" placeholder="••••••••" />
        </div>
        <button type="submit" className="auth-submit" disabled={loading}>
          {loading ? "Signing in…" : "Login"}
        </button>
      </form>

      <p className="auth-foot">
        Don&apos;t have an account? <Link href="/signup">Sign up</Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="auth-card">Loading…</div>}>
      <LoginInner />
    </Suspense>
  );
}
