import Link from "next/link";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-links">
        <Link href="/">Home</Link>
        <Link href="/dashboard">Services</Link>
        <Link href="/about">About</Link>
        <Link href="/contact">Contact</Link>
      </div>
      <div className="footer-content">
        <a
          href="https://www.facebook.com/Lillybelle.Sarl/"
          target="_blank"
          rel="noopener noreferrer"
          className="footer-link"
          aria-label="Facebook"
        >
          <i className="fab fa-facebook-f footer-icon" /> Facebook
        </a>
        <a
          href="https://www.linkedin.com/company/lillybelle/"
          target="_blank"
          rel="noopener noreferrer"
          className="footer-link"
          aria-label="LinkedIn"
        >
          <i className="fab fa-linkedin-in footer-icon" /> LinkedIn
        </a>
        <a href="mailto:info@lillybelle.eu" className="footer-link">
          <i className="fas fa-envelope footer-icon" /> info@lillybelle.eu
        </a>
        <a href="tel:+33608740517" className="footer-link">
          <i className="fas fa-phone footer-icon" /> +(33) 6 08 74 05 17
        </a>
      </div>
      <p className="footer-tagline">Togo Insight — 5G &amp; network analytics, powered by Azure</p>
      <p className="text-center text-muted">© {new Date().getFullYear()} Togo Insight · Developed by Lillybelle</p>
    </footer>
  );
}
