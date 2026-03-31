import { useState, useEffect } from 'react';
import {
  FileText, Upload, Download, Zap, Shield, Clock,
  ArrowRight, Check, Star, Play
} from 'lucide-react';
import './LandingPage.css';

const FEATURES = [
  {
    icon: <Zap size={22} />,
    title: "Instant Extraction",
    desc: "Upload any invoice or receipt — PDF, photo, scan — and get structured data in seconds. Our AI reads every field automatically.",
  },
  {
    icon: <Shield size={22} />,
    title: "99%+ Accuracy",
    desc: "Built on state-of-the-art vision AI. Handles messy scans, handwritten notes, and multi-page invoices with near-perfect precision.",
  },
  {
    icon: <Download size={22} />,
    title: "One-Click Export",
    desc: "Download extracted data as clean Excel or CSV files. Ready to import into QuickBooks, Xero, or any accounting tool.",
  },
  {
    icon: <Clock size={22} />,
    title: "Save 10+ Hours/Week",
    desc: "Stop manually typing invoice data. DocPull processes in seconds what takes your team hours of tedious data entry.",
  },
];

const PLANS = [
  {
    name: "Starter",
    price: "Free",
    period: "",
    docs: "5 docs/month",
    features: ["Single file upload", "CSV export", "Email support"],
    cta: "Get Started Free",
    popular: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/mo",
    docs: "100 docs/month",
    features: ["Batch upload (up to 20)", "Excel + CSV export", "Priority support", "API access"],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Business",
    price: "$79",
    period: "/mo",
    docs: "Unlimited docs",
    features: [
      "Unlimited batch upload",
      "Excel + CSV + JSON export",
      "Dedicated support",
      "Full API access",
      "Team accounts (5 seats)",
      "Custom integrations",
    ],
    cta: "Start Free Trial",
    popular: false,
  },
];

const TESTIMONIALS = [
  {
    name: "Sarah Chen",
    role: "Bookkeeper, Chen Accounting",
    quote: "DocPull saves me at least 12 hours a week. I used to manually enter every invoice — now I just upload and export. Game changer.",
    avatar: "SC",
  },
  {
    name: "Marcus Rodriguez",
    role: "Owner, MR Construction",
    quote: "My team processes hundreds of supplier invoices monthly. DocPull cut our data entry costs by 80%. Pays for itself 10x over.",
    avatar: "MR",
  },
  {
    name: "Jessica Park",
    role: "Office Manager, Greenleaf Dental",
    quote: "The accuracy is incredible. It even reads our handwritten receipts correctly. We tried 3 other tools before landing on DocPull.",
    avatar: "JP",
  },
];

const STATS = [
  { value: "2.4M+", label: "Documents Processed" },
  { value: "99.2%", label: "Extraction Accuracy" },
  { value: "12 hrs", label: "Avg. Time Saved/Week" },
  { value: "4,800+", label: "Happy Businesses" },
];

export default function LandingPage({ onGetStarted, onLogin }) {
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActiveTestimonial((p) => (p + 1) % TESTIMONIALS.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="landing">
      {/* NAV */}
      <nav className="landing-nav">
        <div className="container landing-nav-inner">
          <div className="landing-logo">
            <div className="logo-icon"><FileText size={18} color="#fff" /></div>
            <span className="logo-text">DocPull</span>
          </div>
          <div className="landing-nav-actions">
            <button className="btn btn-ghost" onClick={onLogin}>Log In</button>
            <button className="btn btn-primary" onClick={onGetStarted}>Get Started Free</button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-badge">Stop typing. Start extracting.</div>
          <h1 className="hero-title">
            Turn messy invoices into <span className="text-primary">clean data</span> instantly
          </h1>
          <p className="hero-subtitle">
            Upload any invoice or receipt. Our AI extracts every field — vendor, amounts, line items, tax — and exports it as a clean spreadsheet. In seconds.
          </p>
          <div className="hero-actions">
            <button className="btn btn-primary btn-lg" onClick={onGetStarted}>
              Try It Free <ArrowRight size={18} />
            </button>
            <button className="btn btn-secondary btn-lg">
              <Play size={16} /> Watch Demo
            </button>
          </div>
          <p className="hero-note">No credit card required · 5 free documents/month</p>
        </div>

        {/* Hero visual */}
        <div className="container">
          <div className="hero-visual">
            <div className="hero-visual-bar">
              <div className="dot dot-red" />
              <div className="dot dot-yellow" />
              <div className="dot dot-green" />
              <span className="hero-visual-url">app.docpull.io</span>
            </div>
            <div className="hero-visual-content">
              <div className="hero-upload-zone">
                <Upload size={34} className="hero-upload-icon" />
                <p className="hero-upload-title">Drop invoices here</p>
                <p className="hero-upload-sub">PDF, JPG, PNG — any format</p>
              </div>
              <div className="hero-result">
                <div className="hero-result-badge">
                  <Check size={13} /> Extracted in 2.3s
                </div>
                <table className="hero-result-table">
                  <tbody>
                    {[
                      ["Vendor", "Amazon Web Services"],
                      ["Invoice #", "INV-2026-00418"],
                      ["Date", "March 15, 2026"],
                      ["Total", "$1,359.78"],
                      ["Tax", "$112.28"],
                    ].map(([k, v]) => (
                      <tr key={k}>
                        <td className="hero-result-label">{k}</td>
                        <td className="hero-result-value">{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="stats">
        <div className="container stats-grid">
          {STATS.map((s) => (
            <div key={s.label} className="stat-item">
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="features">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Why businesses switch to DocPull</h2>
            <p className="section-subtitle">Manual data entry is the most hated office task. We eliminate it.</p>
          </div>
          <div className="features-grid">
            {FEATURES.map((f) => (
              <div key={f.title} className="card feature-card">
                <div className="feature-icon">{f.icon}</div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how-it-works">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Three steps. That's it.</h2>
          </div>
          <div className="steps-grid">
            {[
              { step: "01", title: "Upload", desc: "Drag and drop your invoices or receipts. We accept PDF, JPG, PNG, and scanned documents." },
              { step: "02", title: "Extract", desc: "Our AI reads every field — vendor, date, amounts, line items, tax — in under 3 seconds." },
              { step: "03", title: "Export", desc: "Download your clean data as Excel or CSV. Import directly into your accounting software." },
            ].map((s) => (
              <div key={s.step} className="step-item">
                <div className="step-number">{s.step}</div>
                <h3 className="step-title">{s.title}</h3>
                <p className="step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="testimonials">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Loved by real businesses</h2>
          </div>
          <div className="card testimonial-card">
            <div className="testimonial-stars">
              {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="#F59E0B" color="#F59E0B" />)}
            </div>
            <p className="testimonial-quote">"{TESTIMONIALS[activeTestimonial].quote}"</p>
            <div className="testimonial-author">
              <div className="testimonial-avatar">{TESTIMONIALS[activeTestimonial].avatar}</div>
              <div>
                <div className="testimonial-name">{TESTIMONIALS[activeTestimonial].name}</div>
                <div className="testimonial-role">{TESTIMONIALS[activeTestimonial].role}</div>
              </div>
            </div>
            <div className="testimonial-dots">
              {TESTIMONIALS.map((_, i) => (
                <div key={i} className={`testimonial-dot ${i === activeTestimonial ? 'active' : ''}`} onClick={() => setActiveTestimonial(i)} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="pricing">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Simple, transparent pricing</h2>
            <p className="section-subtitle">Start free. Upgrade when you need more.</p>
          </div>
          <div className="pricing-grid">
            {PLANS.map((p) => (
              <div key={p.name} className={`card pricing-card ${p.popular ? 'popular' : ''}`}>
                {p.popular && <div className="popular-badge">Most Popular</div>}
                <h3 className="pricing-name">{p.name}</h3>
                <p className="pricing-docs">{p.docs}</p>
                <div className="pricing-price">
                  <span className="pricing-amount">{p.price}</span>
                  <span className="pricing-period">{p.period}</span>
                </div>
                <ul className="pricing-features">
                  {p.features.map((f) => (
                    <li key={f}><Check size={15} className="pricing-check" /> {f}</li>
                  ))}
                </ul>
                <button className={`btn ${p.popular ? 'btn-primary' : 'btn-secondary'}`} style={{ width: '100%' }} onClick={onGetStarted}>
                  {p.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="container">
          <div className="cta-card">
            <h2 className="cta-title">Stop wasting hours on data entry</h2>
            <p className="cta-desc">Join 4,800+ businesses that trust DocPull to extract their invoice data. Start for free today.</p>
            <button className="btn btn-primary btn-lg" onClick={onGetStarted}>
              Get Started Free <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="container landing-footer-inner">
          <div className="landing-logo">
            <div className="logo-icon logo-icon-sm"><FileText size={13} color="#fff" /></div>
            <span className="logo-text">DocPull</span>
          </div>
          <div className="footer-links">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Support</a>
            <a href="#">API Docs</a>
          </div>
          <div className="footer-copy">&copy; 2026 DocPull. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
