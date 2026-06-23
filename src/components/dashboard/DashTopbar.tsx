"use client";

import { useSession } from "next-auth/react";

export default function DashTopbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const { data: session } = useSession();
  const name = session?.user?.firstName || session?.user?.name || "User";
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="dash-topbar">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="dash-user-chip">
        <span className="dash-avatar">{initial}</span>
        <span>{name}</span>
      </div>
    </div>
  );
}
