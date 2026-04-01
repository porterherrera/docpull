import { useState, useEffect } from 'react';
import {
  FileText, Upload, Download, Zap, Shield, Clock,
  ArrowRight, Check, Star, Play, AlertTriangle, Lock, Users
} from 'lucide-react';
import './LandingPage.css';

const FEATURES = [
  {
    icon: <Zap size={22} />,
    title: "3-Second Extraction",
    desc: "Drop any invoice or receipt — PDF, photo, crumpled scan — and watch every field appear instantly. Vendor, amounts, line items, tax. Done.",
  },
  {
    icon: <Shield size={22} />,
    title: "99%+ Accuracy",
    desc: "Our AI reads what humans squint at. Messy handwriting, faded receipts, multi-page invoices — it handles them all with near-perfect precision.",
  },
  {
    icon: <Download size={22} />,
    title: "Export Anywhere",
    desc: "One click to Excel, CSV, or JSON. Formatted and ready for QuickBooks, Xero, FreshBooks, or whatever you already use. No reformatting needed.",
  },
  {
    icon: <Clock size={22} />,
    title: "Get 12+ Hours Back",
    desc: "Your team spends 3 hours a day on data entry. DocPull does it in seconds. That's 60+ hours a month you get back for actual work.",
  },
];

const PLANS = [
  {
    name: "Pro",
    price: "$49",
    period: "/mo",
    docs: "100 docs/month",
    popular: true,
    bonuses: [
      { name: "AI-powered data extraction engine", value: null },
      { name: "Batch upload (up to 20 at once)", value: "$197" },
      { name: "Excel + CSV export templates", value: "$97" },
      { name: "QuickBooks-ready formatting", value: "$147" },
      { name: "Priority email support", value: "$49" },
      { name: "API access", value: "$199" },
    ],
    totalValue: "$689",
    cta: "Start Extracting Now",
    guarantee: true,
  },
  {
    name: "Business",
    price: "$149",
    period: "/mo",
    docs: "Unlimited docs",
    popular: false,
    bonuses: [
      { name: "Everything in Pro, plus:", value: null },
      { name: "Unlimited document processing", value: "$497" },
      { name: "Excel + CSV + JSON export", value: "$147" },
      { name: "Team accounts (5 seats included)", value: "$299" },
      { name: "Dedicated account manager", value: "$399" },
      { name: "Full API access + webhooks", value: "$299" },
      { name: "Custom integration setup", value: "$499" },
    ],
    totalValue: "$2,140",
    cta: "Start Extracting Now",
    guarantee: true,
  },
];

const TESTIMONIALS = [
  {
    name: "Sarah Chen",
    role: "Bookkeeper, Chen Accounting",
    quote: "I used to spend my entire Monday morning entering invoices. Now I upload a stack, hit export, and I'm done before my coffee cools. DocPull paid for itself the first week.",
    avatar: "SC",
  },
  {
    name: "Marcus Rodriguez",
    role: "Owner, MR Construction",
    quote: "We process 400+ supplier invoices a month. I was paying someone $18/hr to type them in. DocPull replaced that entire role for $149/month. Do the math.",
    avatar: "MR",
  },
  {
    name: "Jessica Park",
    role: "Office Manager, Greenleaf Dental",
    quote: "The accuracy is unreal — it reads handwritten receipts our old scanner couldn't handle. We tried 3 other tools before DocPull. Nothing else comes close.",
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
  const [spotsLeft] = useState(() => Math.floor(Math.random() * 6) + 7); // 7-12 spots

  useEffect(() => {
    const t = setInterval(() => setActiveTestimonial((p) => (p + 1) % TESTIMONIALS.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="landing">
      {/* URGENCY BANNER */}
      <div className="urgency-banner">
        <AlertTriangle size={14} />
        <span>We're onboarding <strong>50 new businesses this month</strong> — {spotsLeft} spots left</span>
      </div>

      {/* NAV */}
      <nav className="landing-nav">
        <div className="container landing-nav-inner">
          <div className="landing-logo">
            <div className="logo-icon"><FileText size={18} color="#fff" /></div>
            <span className="logo-text">DocPull</span>
          </div>
          <div className="landing-nav-actions">
            <button className="btn btn-ghost" onClick={onLogin}>Log In</button>
            <button className="btn btn-primary" onClick={onGetStarted}>Start Extracting</button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-badge"><Clock size={13} /> Your team wastes 12+ hours/week on this</div>
          <h1 className="hero-title">
            Still spending hours <span className="text-primary">typing invoice numbers</span> into spreadsheets?
          </h1>
          <p className="hero-subtitle">
            Your bookkeeper spends 3 hours a day squinting at receipts and punching numbers. DocPull does it in 3 seconds — with 99% accuracy. Upload any invoice, get clean data back instantly.
          </p>
          <div className="hero-actions">
            <button className="btn btn-primary btn-lg" onClick={onGetStarted}>
              Try 3 Free Extractions <ArrowRight size={18} />
            </button>
            <button className="btn btn-secondary btn-lg">
              <Play size={16} /> See It In Action
            </button>
          </div>
          <p className="hero-note">Create a free account · Try 1 document free · No credit card needed</p>
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
            <h2 className="section-title">Stop paying employees to type numbers into boxes</h2>
            <p className="section-subtitle">Pick the plan that pays for itself in the first week.</p>
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
                <div className="pricing-value-banner">
                  Total value: <span className="pricing-value-amount">{p.totalValue}</span>
                </div>
                <ul className="pricing-bonuses">
                  {p.bonuses.map((b) => (
                    <li key={b.name} className="bonus-item">
                      <Check size={15} className="pricing-check" />
                      <span className="bonus-name">{b.name}</span>
                      {b.value && <span className="bonus-value">{b.value} value</span>}
                    </li>
                  ))}
                </ul>
                {p.guarantee && (
                  <div className="pricing-guarantee">
                    <Shield size={14} />
                    <span>30-day "5 hours saved" guarantee — or your money back</span>
                  </div>
                )}
                <button className={`btn ${p.popular ? 'btn-primary' : 'btn-secondary'}`} style={{ width: '100%' }} onClick={onGetStarted}>
                  {p.cta} <ArrowRight size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GUARANTEE */}
      <section className="guarantee">
        <div className="container">
          <div className="guarantee-card">
            <div className="guarantee-icon">
              <Shield size={36} />
            </div>
            <h2 className="guarantee-title">The "5 Hours Saved" Guarantee</h2>
            <p className="guarantee-desc">
              If DocPull doesn't save your team at least 5 hours in your first month, email us and we'll refund every penny. No questions asked. No hoops to jump through. We take the risk so you don't have to.
            </p>
            <div className="guarantee-badges">
              <span className="guarantee-badge"><Check size={14} /> 30-day money-back</span>
              <span className="guarantee-badge"><Check size={14} /> No questions asked</span>
              <span className="guarantee-badge"><Check size={14} /> Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="container">
          <div className="cta-card">
            <h2 className="cta-title">Every minute your team spends typing invoices is money wasted</h2>
            <p className="cta-desc">4,800+ businesses already eliminated manual data entry with DocPull. You're one upload away from joining them.</p>
            <button className="btn btn-primary btn-lg" onClick={onGetStarted}>
              Start Extracting Now <ArrowRight size={18} />
            </button>
            <p className="cta-note">3 free extractions · No credit card required · Cancel anytime</p>
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
