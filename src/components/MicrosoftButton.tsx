"use client";

import { getProviders, signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { useToast } from "@/components/Toast";

/**
 * "Sign in with Microsoft" (Entra ID). Always visible. When the azure-ad provider
 * isn't configured (e.g. keyless local dev), clicking it shows a setup hint instead
 * of erroring. Once AZURE_AD_* env vars are set, it performs the real sign-in.
 * Includes the "or continue with email" divider beneath it.
 */
export default function MicrosoftButton({
  callbackUrl = "/dashboard",
  dividerText = "or continue with email",
}: {
  callbackUrl?: string;
  dividerText?: string;
}) {
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    let active = true;
    getProviders()
      .then((p) => {
        if (active) setConfigured(Boolean(p && p["azure-ad"]));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  function handleClick() {
    if (!configured) {
      toast(
        "Microsoft sign-in isn't configured yet. Add AZURE_AD_CLIENT_ID, AZURE_AD_CLIENT_SECRET and AZURE_AD_TENANT_ID to enable it.",
        "info"
      );
      return;
    }
    setLoading(true);
    signIn("azure-ad", { callbackUrl });
  }

  return (
    <>
      <button
        type="button"
        className="ms-button"
        disabled={loading}
        onClick={handleClick}
        title={configured ? "Sign in with Microsoft" : "Microsoft sign-in needs AZURE_AD_* env vars"}
      >
        <svg className="ms-logo" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect x="1" y="1" width="9" height="9" fill="#f25022" />
          <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
          <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
          <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
        </svg>
        {loading ? "Redirecting…" : "Sign in with Microsoft"}
      </button>
      <div className="auth-divider">{dividerText}</div>
    </>
  );
}
