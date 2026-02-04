import Link from 'next/link';

const s = {
  page: {
    minHeight: "100vh",
    background: "var(--surface-0)",
    color: "var(--text-primary)",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    position: "relative" as const,
  },

  noise: {
    position: "fixed" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(180, 199, 231, 0.02) 2px, rgba(180, 199, 231, 0.02) 4px)",
    pointerEvents: "none" as const,
    zIndex: 0,
    opacity: 0.3,
  },
  
  container: { 
    maxWidth: 1200, 
    margin: "0 auto", 
    padding: "0 var(--space-8)",
    position: "relative" as const,
    zIndex: 1,
  },
  
  navWrap: {
    position: "sticky" as const,
    top: 0,
    zIndex: 100,
    background: "var(--surface-1)",
    borderBottom: "1px solid var(--border-default)",
  },
  
  nav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "var(--space-4) 0",
    gap: "var(--space-4)",
  },
  
  brand: { 
    display: "flex", 
    alignItems: "center", 
    gap: "var(--space-3)", 
    textDecoration: "none", 
    color: "inherit" 
  },
  
  logo: {
    width: 36,
    height: 36,
    borderRadius: 6,
    background: "var(--accent-blue-glow)",
    border: "1px solid var(--accent-blue-dim)",
    color: "var(--accent-blue)",
    display: "grid",
    placeItems: "center",
    fontWeight: 600,
    fontSize: 14,
    letterSpacing: "0.05em",
  },
  
  brandText: { 
    fontSize: "var(--text-base)", 
    fontWeight: 600, 
    letterSpacing: "-0.01em",
    color: "var(--text-primary)",
  },

  brandSub: { 
    fontSize: "var(--text-xs)", 
    color: "var(--text-tertiary)", 
    marginTop: 2,
    letterSpacing: "0.02em",
  },
  
  navLinks: { 
    display: "flex", 
    alignItems: "center", 
    gap: "var(--space-2)",
  },
  
  link: {
    color: "var(--text-secondary)",
    textDecoration: "none",
    fontSize: "var(--text-sm)",
    fontWeight: 500,
    padding: "var(--space-2) var(--space-4)",
    borderRadius: 6,
    transition: "color 180ms cubic-bezier(0.4, 0, 0.2, 1)",
  },
  
  linkPrimary: {
    background: "var(--accent-blue-glow)",
    border: "1px solid var(--accent-blue-dim)",
    color: "var(--accent-blue)",
    padding: "var(--space-2) var(--space-5)",
    borderRadius: 6,
    textDecoration: "none",
    fontSize: "var(--text-sm)",
    fontWeight: 500,
    transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
  },
  
  linkSecondary: {
    border: "1px solid var(--border-default)",
    background: "var(--surface-2)",
    color: "var(--text-primary)",
    padding: "var(--space-2) var(--space-5)",
    borderRadius: 6,
    textDecoration: "none",
    fontSize: "var(--text-sm)",
    fontWeight: 500,
    transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
  },
  
  hero: {
    padding: "var(--space-16) 0 var(--space-12)",
  },

  heroContent: {
    maxWidth: 800,
    margin: "0 auto",
  },
  
  heroTitle: {
    fontSize: "var(--text-3xl)",
    fontWeight: 600,
    lineHeight: 1.2,
    margin: 0,
    letterSpacing: "-0.04em",
    color: "var(--text-primary)",
    textAlign: "center" as const,
  },
  
  heroSub: {
    fontSize: "var(--text-lg)",
    color: "var(--text-secondary)",
    marginTop: "var(--space-5)",
    maxWidth: 640,
    margin: "var(--space-5) auto 0",
    lineHeight: 1.6,
    textAlign: "center" as const,
  },
  
  heroActions: {
    display: "flex",
    gap: "var(--space-4)",
    justifyContent: "center",
    marginTop: "var(--space-8)",
  },
  
  btnPrimary: {
    padding: "var(--space-3) var(--space-6)",
    borderRadius: 6,
    background: "var(--accent-blue-glow)",
    border: "1px solid var(--accent-blue-dim)",
    color: "var(--accent-blue)",
    textDecoration: "none",
    fontWeight: 500,
    fontSize: "var(--text-base)",
    display: "inline-block",
    transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
  },
  
  btnSecondary: {
    padding: "var(--space-3) var(--space-6)",
    borderRadius: 6,
    border: "1px solid var(--border-default)",
    color: "var(--text-primary)",
    textDecoration: "none",
    fontWeight: 500,
    fontSize: "var(--text-base)",
    display: "inline-block",
    background: "var(--surface-2)",
    transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
  },
  
  stats: {
    display: "flex",
    gap: "var(--space-6)",
    justifyContent: "center",
    marginTop: "var(--space-12)",
    flexWrap: "wrap" as const,
  },
  
  stat: {
    padding: "var(--space-5)",
    borderRadius: 8,
    background: "var(--surface-2)",
    border: "1px solid var(--border-subtle)",
    textAlign: "center" as const,
    minWidth: 140,
  },
  
  statValue: {
    fontSize: "var(--text-2xl)",
    fontWeight: 600,
    color: "var(--text-primary)",
    marginBottom: "var(--space-2)",
    letterSpacing: "-0.03em",
  },
  
  statLabel: {
    fontSize: "var(--text-xs)",
    color: "var(--text-tertiary)",
    fontWeight: 500,
    textTransform: "uppercase" as const,
    letterSpacing: "0.1em",
  },
  
  features: {
    padding: "var(--space-16) 0",
  },
  
  sectionHeader: {
    maxWidth: 640,
    margin: "0 auto var(--space-12)",
  },

  sectionLabel: {
    fontSize: "var(--text-xs)",
    color: "var(--accent-blue-dim)",
    fontWeight: 500,
    textTransform: "uppercase" as const,
    letterSpacing: "0.1em",
    marginBottom: "var(--space-3)",
  },
  
  sectionTitle: {
    fontSize: "var(--text-2xl)",
    fontWeight: 600,
    margin: 0,
    letterSpacing: "-0.03em",
    color: "var(--text-primary)",
  },
  
  sectionSub: {
    fontSize: "var(--text-base)",
    color: "var(--text-secondary)",
    marginTop: "var(--space-3)",
    lineHeight: 1.6,
  },
  
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
    gap: "var(--space-6)",
  },
  
  card: {
    padding: "var(--space-5)",
    borderRadius: 8,
    background: "var(--surface-2)",
    border: "1px solid var(--border-subtle)",
    transition: "border-color 180ms cubic-bezier(0.4, 0, 0.2, 1)",
  },

  cardHeader: {
    marginBottom: "var(--space-4)",
  },

  cardLabel: {
    fontSize: "var(--text-xs)",
    color: "var(--text-tertiary)",
    fontWeight: 500,
    textTransform: "uppercase" as const,
    letterSpacing: "0.1em",
  },
  
  cardTitle: {
    fontSize: "var(--text-lg)",
    fontWeight: 600,
    margin: "0 0 var(--space-3) 0",
    color: "var(--text-primary)",
    letterSpacing: "-0.01em",
  },
  
  cardDesc: {
    fontSize: "var(--text-sm)",
    color: "var(--text-secondary)",
    lineHeight: 1.6,
    margin: 0,
  },
  
  roadmap: {
    padding: "var(--space-16) 0",
    background: "var(--surface-1)",
    borderTop: "1px solid var(--border-subtle)",
    borderBottom: "1px solid var(--border-subtle)",
  },
  
  timeline: {
    maxWidth: 800,
    margin: "0 auto",
  },
  
  timelineItem: {
    display: "flex",
    gap: "var(--space-6)",
    marginBottom: "var(--space-8)",
    alignItems: "flex-start",
  },
  
  timelinePeriod: {
    padding: "var(--space-2) var(--space-4)",
    borderRadius: 6,
    background: "var(--accent-mint-glow)",
    border: "1px solid var(--accent-mint-dim)",
    color: "var(--accent-mint-dim)",
    fontWeight: 500,
    fontSize: "var(--text-xs)",
    whiteSpace: "nowrap" as const,
    flexShrink: 0,
    letterSpacing: "0.05em",
    textTransform: "uppercase" as const,
  },
  
  timelineCard: {
    flex: 1,
    padding: "var(--space-5)",
    background: "var(--surface-2)",
    borderRadius: 8,
    border: "1px solid var(--border-subtle)",
  },
  
  timelineTitle: {
    fontSize: "var(--text-lg)",
    fontWeight: 600,
    margin: "0 0 var(--space-4) 0",
    color: "var(--text-primary)",
    letterSpacing: "-0.01em",
  },
  
  timelineList: {
    margin: 0,
    padding: "0 0 0 var(--space-5)",
    color: "var(--text-secondary)",
    fontSize: "var(--text-sm)",
    lineHeight: 1.8,
  },
  
  cta: {
    padding: "var(--space-16) 0",
    textAlign: "center" as const,
    maxWidth: 640,
    margin: "0 auto",
  },
  
  ctaTitle: {
    fontSize: "var(--text-2xl)",
    fontWeight: 600,
    margin: 0,
    letterSpacing: "-0.03em",
    color: "var(--text-primary)",
  },
  
  ctaSub: {
    fontSize: "var(--text-base)",
    color: "var(--text-secondary)",
    marginTop: "var(--space-3)",
  },
  
  ctaActions: {
    display: "flex",
    gap: "var(--space-4)",
    justifyContent: "center",
    marginTop: "var(--space-8)",
  },
  
  footer: {
    background: "var(--surface-1)",
    borderTop: "1px solid var(--border-default)",
    color: "var(--text-secondary)",
    padding: "var(--space-12) 0 var(--space-6)",
  },
  
  footerContent: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: "var(--space-12)",
    marginBottom: "var(--space-8)",
  },

  footerDesc: {
    fontSize: "var(--text-sm)",
    color: "var(--text-tertiary)",
    marginTop: "var(--space-3)",
    maxWidth: 400,
  },
  
  footerLinks: {
    display: "flex",
    gap: "var(--space-12)",
  },
  
  footerLinkTitle: {
    fontSize: "var(--text-xs)",
    fontWeight: 600,
    color: "var(--text-primary)",
    marginBottom: "var(--space-3)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.1em",
  },
  
  footerLink: {
    display: "block",
    color: "var(--text-secondary)",
    textDecoration: "none",
    fontSize: "var(--text-sm)",
    marginBottom: "var(--space-2)",
    transition: "color 180ms ease",
  },
  
  footerBottom: {
    paddingTop: "var(--space-6)",
    borderTop: "1px solid var(--border-subtle)",
    textAlign: "center" as const,
    fontSize: "var(--text-xs)",
    color: "var(--text-tertiary)",
  },
};

export default function HomePage() {
  return (
    <main style={s.page}>
      {/* Subtle texture overlay only */}
      <div style={s.noise}></div>

      {/* Navigation */}
      <div style={s.navWrap}>
        <div style={s.container}>
          <nav style={s.nav}>
            <Link href="/" style={s.brand}>
              <div style={s.logo}>HS</div>
              <div>
                <div style={s.brandText}>Holland Systems</div>
                <div style={s.brandSub}>Enterprise Assessment</div>
              </div>
            </Link>
            <div style={s.navLinks}>
              <Link href="#platform" style={s.link}>Platform</Link>
              <Link href="#roadmap" style={s.link}>Roadmap</Link>
              <Link href="/employer/signup" style={s.linkPrimary}>Start Trial</Link>
              <Link href="/employer/login" style={s.linkSecondary}>Sign In</Link>
            </div>
          </nav>
        </div>
      </div>

      {/* Hero Section */}
      <div style={s.container}>
        <section style={s.hero}>
          <div style={s.heroContent}>
            <h1 style={s.heroTitle}>
              Psychometric Assessment<br/>for Enterprise Hiring
            </h1>
            <p style={s.heroSub}>
              Evaluate cognitive ability, personality traits, and role alignment through validated instruments.
              Generate structured reports for hiring decisions.
            </p>
            <div style={s.heroActions}>
              <Link href="/employer/register" style={s.btnPrimary}>Start Trial</Link>
              <Link href="#platform" style={s.btnSecondary}>Documentation</Link>
            </div>
          </div>
          
          <div style={s.stats}>
            <div style={s.stat}>
              <div style={s.statValue}>96%</div>
              <div style={s.statLabel}>Time reduction</div>
            </div>
            <div style={s.stat}>
              <div style={s.statValue}>$250k</div>
              <div style={s.statLabel}>Annual savings</div>
            </div>
            <div style={s.stat}>
              <div style={s.statValue}>24/7</div>
              <div style={s.statLabel}>Availability</div>
            </div>
          </div>
        </section>

        {/* Platform Features */}
        <section id="platform" style={s.features}>
          <div style={s.sectionHeader}>
            <div style={s.sectionLabel}>Platform</div>
            <h2 style={s.sectionTitle}>Automated Assessment Pipeline</h2>
            <p style={s.sectionSub}>Replace manual evaluation with validated psychometric instruments</p>
          </div>

          <div style={s.grid}>
            <div style={s.card}>
              <div style={s.cardHeader}>
                <div style={s.cardLabel}>Screening</div>
              </div>
              <h3 style={s.cardTitle}>Candidate Screening</h3>
              <p style={s.cardDesc}>
                Automated resume evaluation, cognitive testing, and personality profiling
                with standardized scoring.
              </p>
            </div>

            <div style={s.card}>
              <div style={s.cardHeader}>
                <div style={s.cardLabel}>Assessment</div>
              </div>
              <h3 style={s.cardTitle}>Psychometric Testing</h3>
              <p style={s.cardDesc}>
                60-question adaptive assessment measuring eight validated constructs
                with instant PDF reports.
              </p>
            </div>

            <div style={s.card}>
              <div style={s.cardHeader}>
                <div style={s.cardLabel}>Scheduling</div>
              </div>
              <h3 style={s.cardTitle}>Interview Coordination</h3>
              <p style={s.cardDesc}>
                Calendar integration, automated reminders, and availability matching
                across time zones.
              </p>
            </div>

            <div style={s.card}>
              <div style={s.cardHeader}>
                <div style={s.cardLabel}>Communication</div>
              </div>
              <h3 style={s.cardTitle}>Email Automation</h3>
              <p style={s.cardDesc}>
                Status updates, assessment invitations, and structured feedback
                sent automatically.
              </p>
            </div>

            <div style={s.card}>
              <div style={s.cardHeader}>
                <div style={s.cardLabel}>Onboarding</div>
              </div>
              <h3 style={s.cardTitle}>Workflow Management</h3>
              <p style={s.cardDesc}>
                Document processing, compliance tracking, and training schedule
                coordination.
              </p>
            </div>

            <div style={s.card}>
              <div style={s.cardHeader}>
                <div style={s.cardLabel}>Analytics</div>
              </div>
              <h3 style={s.cardTitle}>Data Intelligence</h3>
              <p style={s.cardDesc}>
                Pipeline metrics, score distributions, time-to-hire analysis,
                and predictive modeling.
              </p>
            </div>
          </div>
        </section>

        {/* Roadmap */}
        <section id="roadmap" style={s.roadmap}>
          <div style={s.sectionHeader}>
            <div style={s.sectionLabel}>Development</div>
            <h2 style={s.sectionTitle}>Product Roadmap</h2>
            <p style={s.sectionSub}>
              Expanding to full talent lifecycle management
            </p>
          </div>

          <div style={s.timeline}>
            <div style={s.timelineItem}>
              <div style={s.timelinePeriod}>Q2 2026</div>
              <div style={s.timelineCard}>
                <h3 style={s.timelineTitle}>Enhanced Screening</h3>
                <ul style={s.timelineList}>
                  <li>Resume parsing with NLP extraction</li>
                  <li>Multi-stage interview scheduling</li>
                  <li>Templated communication workflows</li>
                  <li>Candidate portal with status tracking</li>
                </ul>
              </div>
            </div>

            <div style={s.timelineItem}>
              <div style={s.timelinePeriod}>Q3 2026</div>
              <div style={s.timelineCard}>
                <h3 style={s.timelineTitle}>ATS Integration</h3>
                <ul style={s.timelineList}>
                  <li>Job board synchronization</li>
                  <li>Offer letter generation with e-signature</li>
                  <li>Background check API integration</li>
                  <li>Compliance documentation automation</li>
                </ul>
              </div>
            </div>

            <div style={s.timelineItem}>
              <div style={s.timelinePeriod}>Q4 2026</div>
              <div style={s.timelineCard}>
                <h3 style={s.timelineTitle}>Lifecycle Management</h3>
                <ul style={s.timelineList}>
                  <li>Performance review scheduling</li>
                  <li>Employee data management</li>
                  <li>Workforce planning tools</li>
                  <li>Retention prediction models</li>
                </ul>
              </div>
            </div>

            <div style={s.timelineItem}>
              <div style={s.timelinePeriod}>2027</div>
              <div style={s.timelineCard}>
                <h3 style={s.timelineTitle}>Enterprise Platform</h3>
                <ul style={s.timelineList}>
                  <li>Global workforce coordination</li>
                  <li>Regulatory compliance automation</li>
                  <li>Succession planning intelligence</li>
                  <li>Advanced predictive analytics</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section style={s.cta}>
          <h2 style={s.ctaTitle}>Evaluate candidates systematically</h2>
          <p style={s.ctaSub}>
            Enterprise assessment tools with validated psychometric instruments
          </p>
          <div style={s.ctaActions}>
            <Link href="/employer/register" style={s.btnPrimary}>Start Trial</Link>
            <Link href="/employer/login" style={s.btnSecondary}>Sign In</Link>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer style={s.footer}>
        <div style={s.container}>
          <div style={s.footerContent}>
            <div>
              <div style={s.brand}>
                <div style={s.logo}>HS</div>
                <div>
                  <div style={s.brandText}>Holland Systems</div>
                  <div style={s.brandSub}>Enterprise Assessment</div>
                </div>
              </div>
              <p style={s.footerDesc}>
                Validated psychometric instruments for enterprise hiring decisions
              </p>
            </div>
            <div style={s.footerLinks}>
              <div>
                <h4 style={s.footerLinkTitle}>Platform</h4>
                <Link href="#platform" style={s.footerLink}>Features</Link>
                <Link href="#roadmap" style={s.footerLink}>Roadmap</Link>
                <Link href="/employer/analytics" style={s.footerLink}>Analytics</Link>
              </div>
              <div>
                <h4 style={s.footerLinkTitle}>Resources</h4>
                <Link href="#" style={s.footerLink}>Documentation</Link>
                <Link href="#" style={s.footerLink}>API Reference</Link>
                <Link href="#" style={s.footerLink}>Privacy Policy</Link>
              </div>
            </div>
          </div>
          <div style={s.footerBottom}>
            © 2026 Holland Systems. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  );
}
