import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "About | Togo Insight" };

export default function AboutPage() {
  return (
    <>
      <section className="main-hero" style={{ paddingBottom: 30 }}>
        <div className="hero-text" style={{ maxWidth: "100%", textAlign: "center", margin: "0 auto" }}>
          <div className="tech-badge"><i className="fas fa-circle-info" /> About Togo Insight</div>
          <h1>
            Measuring &amp; optimizing <span className="highlight">5G networks</span>
          </h1>
          <p style={{ maxWidth: 760, margin: "0 auto" }}>
            Togo Insight is Lillybelle&apos;s telecom analytics platform. We turn drive-test and network
            measurement data into clear, auditable quality indicators — delivered through Microsoft
            Azure and Power BI.
          </p>
        </div>
      </section>

      <section className="services-preview">
        <div className="services-grid">
          {[
            { icon: "fa-bullseye", title: "Our Mission", text: "Give operators and regulators a single source of truth for network quality, from raw measurements to executive dashboards." },
            { icon: "fa-microchip", title: "Our Technology", text: "PESQ/POLQA voice analysis, spectrum and protocol testing, and an Azure-native data pipeline feeding Power BI." },
            { icon: "fa-handshake", title: "Our Promise", text: "Standard-compliant, repeatable methodology and a platform your engineers actually enjoy using." },
          ].map((c) => (
            <div className="service-card" key={c.title}>
              <div className="card-icon"><i className={`fas ${c.icon}`} /></div>
              <h3>{c.title}</h3>
              <p>{c.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="feature-section">
        <div className="hero-image">
          <div className="hero-visual small">
            <span className="ring r1" />
            <span className="ring r2" />
            <span className="ring r3" />
            <div className="hero-visual-core"><i className="fas fa-tower-cell" /></div>
          </div>
        </div>
        <div className="hero-text">
          <div className="tech-badge"><i className="fas fa-cloud" /> Azure-native</div>
          <h2>
            Built for <span className="highlight">scale &amp; security</span>
          </h2>
          <p>
            Files are uploaded straight to Azure Blob Storage, processed by our pipeline, and stored as
            ARCEP- and Lillybelle-ready outputs. Dashboards are served from Power BI Embedded, and
            access is protected by Microsoft Entra ID.
          </p>
          <ul className="tech-features">
            <li><i className="fas fa-check-circle" /> Hosted entirely on Microsoft Azure</li>
            <li><i className="fas fa-check-circle" /> Single sign-on with Microsoft accounts</li>
            <li><i className="fas fa-check-circle" /> Power BI dashboards with rich filtering</li>
          </ul>
          <Link href="/dashboard" className="cta-button">
            Open the platform <i className="fas fa-arrow-right" />
          </Link>
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-content">
          <h2>Want a walkthrough?</h2>
          <p>Reach out and we&apos;ll show you how Togo Insight fits your network operations.</p>
          <Link href="/contact" className="cta-button">
            Contact us <i className="fas fa-envelope" />
          </Link>
        </div>
      </section>
    </>
  );
}
