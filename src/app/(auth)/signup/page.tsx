"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Logo from "@/components/Logo";
import MicrosoftButton from "@/components/MicrosoftButton";
import { COUNTRIES } from "@/lib/countries";

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = e.currentTarget;
    const get = (n: string) => (form.elements.namedItem(n) as HTMLInputElement | HTMLSelectElement).value;

    const payload = {
      firstName: get("firstName"),
      lastName: get("lastName"),
      country: get("country"),
      phone: get("phone"),
      email: get("email"),
      password: get("password"),
      confirmPassword: get("confirmPassword"),
    };

    if (payload.password !== payload.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (payload.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || "Could not create your account.");
        setLoading(false);
        return;
      }
      // Auto sign-in for a smooth flow.
      const login = await signIn("credentials", {
        email: payload.email,
        password: payload.password,
        redirect: false,
      });
      if (login?.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        router.push("/login");
      }
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="auth-card" style={{ maxWidth: 480 }}>
      <Link href="/" aria-label="Home">
        <Logo height={60} className="form-logo" />
      </Link>
      <h2>Create account</h2>
      <p className="auth-subtitle">Start exploring your network dashboards</p>

      <MicrosoftButton callbackUrl="/dashboard" dividerText="or sign up with email" />

      <form className="auth-form" onSubmit={handleSubmit}>
        {error && <div className="form-error">{error}</div>}
        <div className="auth-row-2">
          <div className="field">
            <label htmlFor="firstName"><i className="fas fa-user" /> First name</label>
            <input id="firstName" name="firstName" type="text" required placeholder="Ada" />
          </div>
          <div className="field">
            <label htmlFor="lastName"><i className="fas fa-user" /> Last name</label>
            <input id="lastName" name="lastName" type="text" required placeholder="Lovelace" />
          </div>
        </div>
        <div className="auth-row-2">
          <div className="field">
            <label htmlFor="country"><i className="fas fa-globe" /> Country</label>
            <select id="country" name="country" defaultValue="Togo">
              {COUNTRIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="phone"><i className="fas fa-phone" /> Phone</label>
            <input id="phone" name="phone" type="tel" placeholder="+228 …" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="email"><i className="fas fa-envelope" /> Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" placeholder="you@company.com" />
        </div>
        <div className="auth-row-2">
          <div className="field">
            <label htmlFor="password"><i className="fas fa-lock" /> Password</label>
            <input id="password" name="password" type="password" required minLength={8} placeholder="••••••••" />
          </div>
          <div className="field">
            <label htmlFor="confirmPassword"><i className="fas fa-lock" /> Confirm</label>
            <input id="confirmPassword" name="confirmPassword" type="password" required minLength={8} placeholder="••••••••" />
          </div>
        </div>
        <button type="submit" className="auth-submit" disabled={loading}>
          {loading ? "Creating account…" : "Sign up"}
        </button>
      </form>

      <p className="auth-foot">
        Already have an account? <Link href="/login">Login</Link>
      </p>
    </div>
  );
}
