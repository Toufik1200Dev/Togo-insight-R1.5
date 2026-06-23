"use client";

import { useState } from "react";

export default function ContactPage() {
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);
    setLoading(true);
    const form = e.currentTarget;
    const data = {
      name: (form.elements.namedItem("name") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      message: (form.elements.namedItem("message") as HTMLTextAreaElement).value,
    };
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setStatus({ type: "success", msg: json.message });
        form.reset();
      } else {
        setStatus({ type: "error", msg: json.message || "Something went wrong." });
      }
    } catch {
      setStatus({ type: "error", msg: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <section className="main-hero" style={{ paddingBottom: 10 }}>
        <div className="hero-text" style={{ maxWidth: "100%", textAlign: "center", margin: "0 auto" }}>
          <div className="tech-badge"><i className="fas fa-paper-plane" /> Contact</div>
          <h1>
            Let&apos;s <span className="highlight">talk</span>
          </h1>
          <p style={{ maxWidth: 640, margin: "0 auto" }}>
            Questions about Togo Insight, 5G measurement, or a custom dashboard? Send us a message.
          </p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 10 }}>
        <div style={{ display: "flex", gap: 30, flexWrap: "wrap", maxWidth: 1000, margin: "0 auto", alignItems: "flex-start" }}>
          <div className="panel" style={{ flex: "1 1 320px" }}>
            <h3 style={{ fontFamily: "Space Grotesk, sans-serif", marginBottom: 18 }}>Get in touch</h3>
            <p className="footer-link" style={{ marginBottom: 14 }}>
              <i className="fas fa-envelope footer-icon" /> info@lillybelle.eu
            </p>
            <p className="footer-link" style={{ marginBottom: 14 }}>
              <i className="fas fa-phone footer-icon" /> +(33) 6 08 74 05 17
            </p>
            <p className="footer-link" style={{ marginBottom: 14 }}>
              <i className="fab fa-linkedin-in footer-icon" /> linkedin.com/company/lillybelle
            </p>
            <p className="footer-link">
              <i className="fab fa-facebook-f footer-icon" /> facebook.com/Lillybelle.Sarl
            </p>
          </div>

          <form className="panel auth-form" style={{ flex: "1 1 380px" }} onSubmit={handleSubmit}>
            {status && <div className={status.type === "success" ? "form-success" : "form-error"}>{status.msg}</div>}
            <div className="field">
              <label htmlFor="name"><i className="fas fa-user" /> Name</label>
              <input id="name" name="name" type="text" required placeholder="Your name" />
            </div>
            <div className="field">
              <label htmlFor="email"><i className="fas fa-envelope" /> Email</label>
              <input id="email" name="email" type="email" required placeholder="you@company.com" />
            </div>
            <div className="field">
              <label htmlFor="message"><i className="fas fa-comment" /> Message</label>
              <textarea
                id="message"
                name="message"
                required
                rows={5}
                placeholder="How can we help?"
                style={{
                  width: "100%",
                  padding: 12,
                  border: "1px solid rgba(34,211,238,0.3)",
                  background: "rgba(11,18,32,0.5)",
                  borderRadius: 8,
                  color: "var(--text-color)",
                  outline: "none",
                  resize: "vertical",
                  fontFamily: "Poppins, sans-serif",
                }}
              />
            </div>
            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? "Sending…" : "Send message"}
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
