"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import Logo from "@/components/Logo";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Services" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`navbar${scrolled ? " scrolled" : ""}`}>
      <Link href="/" className="logo" aria-label="Togo Insight home">
        <Logo height={52} />
      </Link>

      <nav>
        {LINKS.map((l) => {
          const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
          return (
            <Link key={l.href} href={l.href} className={active ? "active" : ""}>
              {l.label}
            </Link>
          );
        })}
      </nav>

      {status === "authenticated" && session?.user ? (
        <div className="navbar-user">
          <h2>Hello {session.user.firstName || session.user.name || "there"}!</h2>
          <button type="button" className="btn-ghost" onClick={() => signOut({ callbackUrl: "/" })}>
            Logout
          </button>
        </div>
      ) : (
        <div className="navbar-actions">
          <Link href="/signup" className="btn-ghost">
            Sign up
          </Link>
          <Link href="/login" className="contact-button">
            Login
          </Link>
        </div>
      )}
    </header>
  );
}
