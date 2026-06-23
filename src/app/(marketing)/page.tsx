import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Togo Insight | Next-Gen 5G Network Optimization",
};

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="main-hero">
        <div className="hero-text">
          <div className="tech-badge">
            <i className="fas fa-tower-cell" /> 5G &amp; Network Analytics
          </div>
          <h1>
            Next-Gen Wireless <span className="highlight">Network</span>
          </h1>
          <p>
            Precision measurement and optimization of service quality across 5G, 4G and 3G networks —
            raw drive-test data in, decision-ready analytics out, powered by Microsoft Azure and Power BI.
          </p>
          <div className="stats">
            <div>
              <p>60+</p>
              <span>Satisfied Clients</span>
            </div>
            <div>
              <p>40+</p>
              <span>Team Members</span>
            </div>
            <div>
              <p>200+</p>
              <span>Daily Active Users</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", marginTop: 26 }}>
            <Link href="/dashboard" className="cta-button" style={{ marginTop: 0 }}>
              Explore Solutions <i className="fas fa-arrow-right" />
            </Link>
            <Link href="/about" className="btn-outline">
              Read more
            </Link>
          </div>
          <div className="hero-social">
            <span className="label">Follow</span>
            <a href="https://www.facebook.com/Lillybelle.Sarl/" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <i className="fab fa-facebook-f" />
            </a>
            <a href="https://www.linkedin.com/company/lillybelle/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
              <i className="fab fa-linkedin-in" />
            </a>
            <a href="https://x.com" target="_blank" rel="noopener noreferrer" aria-label="X">
              <i className="fab fa-x-twitter" />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <i className="fab fa-instagram" />
            </a>
          </div>
        </div>

        {/* CSS hero visual (5G rings + tower) — no external image required */}
        <div className="hero-image">
          <div className="hero-visual">
            <span className="ring r1" />
            <span className="ring r2" />
            <span className="ring r3" />
            <div className="hero-visual-core">
              <i className="fas fa-tower-cell" />
              <span className="g5">5G</span>
            </div>
            <i className="floaty f1 fas fa-satellite-dish" />
            <i className="floaty f2 fas fa-wifi" />
            <i className="floaty f3 fas fa-signal" />
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="services-preview" id="services">
        <h2>
          We Provide the Best <span className="highlight">Services</span>
        </h2>
        <div className="services-grid">
          {[
            {
              icon: "fa-satellite-dish",
              title: "Network Analysis",
              text: "Advanced spectral analysis and 5G performance optimization using state-of-the-art measurement equipment.",
            },
            {
              icon: "fa-tower-broadcast",
              title: "Voice Quality Assessment",
              text: "Evaluate voice quality on mobile networks with precision PESQ/POLQA analyzers and standard protocols.",
            },
            {
              icon: "fa-wifi",
              title: "Signal Optimization",
              text: "Optimize coverage and throughput with specialized mapping, KPI scoring and enhancement tools.",
            },
            {
              icon: "fa-chart-column",
              title: "Power BI Dashboards",
              text: "Processed results flow to Azure Storage and surface as interactive Power BI dashboards in your account.",
            },
          ].map((s) => (
            <div className="service-card" key={s.title}>
              <div className="card-icon">
                <i className={`fas ${s.icon}`} />
              </div>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Blue "Simple Solution" band (from the landing reference) */}
      <section className="solution-band">
        <div className="solution-inner">
          <div className="solution-text">
            <div className="tech-badge" style={{ background: "rgba(255,255,255,0.15)", color: "#fff", borderColor: "rgba(255,255,255,0.3)" }}>
              <i className="fas fa-layer-group" /> Simple Solution
            </div>
            <h2>From raw CSV to decision-ready dashboards</h2>
            <p>One secure pipeline: upload, process on Azure, and explore in Power BI — no spreadsheets to wrangle.</p>
            <ul className="tech-features">
              <li><i className="fas fa-check-circle" /> Drag &amp; drop CSV ingestion to Azure Blob Storage</li>
              <li><i className="fas fa-check-circle" /> Automated Lillybelle &amp; ARCEP output generation</li>
              <li><i className="fas fa-check-circle" /> Live Power BI dashboards with filters</li>
              <li><i className="fas fa-check-circle" /> Sign in with Microsoft (Entra ID)</li>
            </ul>
            <Link href="/dashboard" className="cta-button" style={{ background: "#fff", color: "#1e40af" }}>
              Get Started <i className="fas fa-rocket" />
            </Link>
          </div>
          <div className="solution-visual">
            <div className="float-card">
              <i className="fas fa-cloud-arrow-up" />
              <span>Upload</span>
            </div>
            <div className="float-card delay">
              <i className="fas fa-gears" />
              <span>Process on Azure</span>
            </div>
            <div className="float-card delay2">
              <i className="fas fa-chart-pie" />
              <span>Power BI</span>
            </div>
          </div>
        </div>
      </section>

      {/* Agency / About feature */}
      <section className="feature-section reverse">
        <div className="hero-text">
          <div className="tech-badge">
            <i className="fas fa-building" /> Our Agency
          </div>
          <h2>
            Telecom expertise, <span className="highlight">cloud-native</span> delivery
          </h2>
          <p>
            For over a decade Lillybelle has measured and optimized cellular networks across 15+
            countries. Togo Insight packages that expertise into a modern Azure platform so your team
            gets reliable KPIs without the heavy lifting.
          </p>
          <ul className="tech-features">
            <li><i className="fas fa-check-circle" /> Multi-protocol testing (5G/4G/3G/Voice)</li>
            <li><i className="fas fa-check-circle" /> Industry-standard, auditable methodology</li>
            <li><i className="fas fa-check-circle" /> End-to-end service quality verification</li>
          </ul>
        </div>
        <div className="hero-image">
          <div className="hero-visual small">
            <span className="ring r1" />
            <span className="ring r2" />
            <div className="hero-visual-core">
              <i className="fas fa-globe-africa" />
            </div>
          </div>
        </div>
      </section>

      {/* Global stats */}
      <section className="global-stats">
        <h2>
          Global <span className="highlight">Impact</span>
        </h2>
        <div className="stats-container">
          {[
            { icon: "fa-globe-africa", n: "15+", l: "Countries Served" },
            { icon: "fa-network-wired", n: "500+", l: "Networks Optimized" },
            { icon: "fa-diagram-project", n: "1200+", l: "Projects Completed" },
            { icon: "fa-users", n: "3M+", l: "Users Impacted" },
          ].map((s) => (
            <div className="stat-item" key={s.l}>
              <div className="stat-icon">
                <i className={`fas ${s.icon}`} />
              </div>
              <div className="stat-number">{s.n}</div>
              <div className="stat-label">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="services-preview">
        <h2>
          What Clients <span className="highlight">Say</span>
        </h2>
        <div className="services-grid">
          {[
            {
              q: "Togo Insight cut our reporting time from days to minutes. The Power BI dashboards are exactly what management asked for.",
              n: "Network Operations Lead",
              c: "National Operator",
            },
            {
              q: "Uploading drive-test CSVs and getting ARCEP-ready outputs automatically is a game changer for compliance.",
              n: "Regulatory Analyst",
              c: "Telecom Authority",
            },
            {
              q: "Sign-in with Microsoft and clean KPIs — our engineers adopted it on day one.",
              n: "Radio Engineer",
              c: "Regional ISP",
            },
          ].map((t) => (
            <div className="service-card" key={t.n}>
              <div className="card-icon">
                <i className="fas fa-quote-left" />
              </div>
              <p style={{ fontStyle: "italic", marginBottom: 16 }}>{t.q}</p>
              <h3 style={{ fontSize: "1.05rem" }}>{t.n}</h3>
              <p style={{ color: "rgba(229,231,235,0.6)" }}>{t.c}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready to Optimize Your Network?</h2>
          <p>
            Create your account or sign in with Microsoft, upload your data, and watch the dashboards
            come to life.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/signup" className="cta-button">
              Get Started <i className="fas fa-rocket" />
            </Link>
            <Link href="/login" className="btn-ghost" style={{ padding: "12px 25px", borderRadius: 50 }}>
              I already have an account
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
