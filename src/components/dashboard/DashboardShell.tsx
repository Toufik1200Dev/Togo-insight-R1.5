"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import Logo from "@/components/Logo";

const NAV = [
  { href: "/dashboard", label: "Files", icon: "fa-folder-open", exact: true },
  { href: "/dashboard/dashboards", label: "Dashboards", icon: "fa-chart-column" },
  { href: "/dashboard/history", label: "History", icon: "fa-clock-rotate-left" },
];

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="dash-shell">
      <aside className={`dash-sidebar ${open ? "open" : ""}`}>
        <Link href="/" className="dash-brand" aria-label="Togo Insight home">
          <Logo height={40} />
          <span>Togo Insight</span>
        </Link>

        <div className="dash-nav-label">Workspace</div>
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`dash-nav-item ${active ? "active" : ""}`}
              onClick={() => setOpen(false)}
            >
              <i className={`fas ${item.icon}`} />
              {item.label}
            </Link>
          );
        })}

        <div className="dash-nav-label">Account</div>
        <Link href="/" className="dash-nav-item" onClick={() => setOpen(false)}>
          <i className="fas fa-arrow-left" />
          Back to site
        </Link>
        <Link href="/contact" className="dash-nav-item" onClick={() => setOpen(false)}>
          <i className="fas fa-life-ring" />
          Support
        </Link>

        <div className="dash-sidebar-foot">
          <button type="button" className="dash-logout" onClick={() => signOut({ callbackUrl: "/" })}>
            <i className="fas fa-right-from-bracket" /> Logout
          </button>
        </div>
      </aside>

      <main className="dash-main">
        <button type="button" className="dash-mobile-toggle" onClick={() => setOpen((o) => !o)}>
          <i className="fas fa-bars" /> Menu
        </button>
        {children}
      </main>
    </div>
  );
}
