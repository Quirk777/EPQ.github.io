import Link from 'next/link';
import ParticleBackground from './components/ParticleBackground';

export default function HomePage() {
  return (
    <main style={s.page}>
      {/* Animated Background */}
      <ParticleBackground />
      <div style={s.backgroundContainer}>
        <div style={s.gradientOrb1}></div>
        <div style={s.gradientOrb2}></div>
        <div style={s.gradientOrb3}></div>
        <div style={s.gridOverlay}></div>
      </div>

      {/* Navigation - Glassmorphism */}
      <div style={s.navWrap}>
        <div style={s.container}>
          <nav style={s.nav}>
            <Link href="/" style={s.brand}>
              <div style={s.logo}>HS</div>
              <div>
                <div style={s.brandTextTop}>Holland Systems</div>
                <div style={s.brandTextSub}>Enterprise Talent Intelligence</div>
              </div>
            </Link>
            <div style={s.navLinks}>
              <Link href="#platform" style={s.link}>Platform</Link>
              <Link href="#roadmap" style={s.link}>Roadmap</Link>
              <Link href="/employer/signup" style={s.linkPrimary}>Get Started</Link>
              <Link href="/employer/login" style={s.linkOutline}>Sign In</Link>
            </div>
          </nav>
        </div>
      </div>

      {/* Hero Section - Glassmorphism */}
      <div style={s.container}>
        <section style={s.hero}>
          <div style={s.heroGlass}>
            <div style={s.heroIconFloat}>
              <span style={s.heroIcon}>⚡</span>
            </div>
            <h1 style={s.heroTitle}>
              Automate Your <span style={s.gradient}>Entire HR Process</span>
            </h1>
            <p style={s.heroSub}>
              From candidate screening to onboarding, EPQ replaces manual HR tasks with intelligent automation.
              What takes hours now takes seconds.
            </p>
            <div style={s.heroActions}>
              <Link href="/employer/register" style={s.btnPrimary}>Start Free Trial</Link>
              <Link href="#platform" style={s.btnSecondary}>See How It Works</Link>
            </div>
          </div>
          
          <div style={s.stats}>
            <div style={s.statGlass}>
              <div style={s.statValue}>96%</div>
              <div style={s.statLabel}>Time Saved</div>
            </div>
            <div style={s.statGlass}>
              <div style={s.statValue}>$250k</div>
              <div style={s.statLabel}>Avg Annual Savings</div>
            </div>
            <div style={s.statGlass}>
              <div style={s.statValue}>24/7</div>
              <div style={s.statLabel}>Always Active</div>
            </div>
          </div>
        </section>

        {/* Platform Features */}
        <section id="platform" style={s.features}>
          <div style={s.sectionHeader}>
            <h2 style={s.sectionTitle}>The Future of HR is Automated</h2>
            <p style={s.sectionSub}>Replace repetitive tasks with AI-powered workflows</p>
          </div>

          <div style={s.grid}>
            <div style={s.cardGlass}>
              <div style={s.cardGlow}></div>
              <div style={s.cardContent}>
                <div style={s.cardIcon}>🎯</div>
                <h3 style={s.cardTitle}>Smart Candidate Screening</h3>
                <p style={s.cardDesc}>
                  Automatically evaluate resumes, rank candidates, and identify top talent in seconds.
                  No more manual resume reviews.
                </p>
              </div>
            </div>

            <div style={s.cardGlass}>
              <div style={s.cardGlow}></div>
              <div style={s.cardContent}>
                <div style={s.cardIcon}>📋</div>
                <h3 style={s.cardTitle}>Automated Assessments</h3>
                <p style={s.cardDesc}>
                  Psychometric testing, skills evaluation, and cultural fit analysis—all automated
                  with instant reports.
                </p>
              </div>
            </div>

            <div style={s.cardGlass}>
              <div style={s.cardGlow}></div>
              <div style={s.cardContent}>
                <div style={s.cardIcon}>📅</div>
                <h3 style={s.cardTitle}>Interview Scheduling</h3>
                <p style={s.cardDesc}>
                  Let the system handle calendar coordination, reminders, and follow-ups.
                  Your team stays focused on decisions.
                </p>
              </div>
            </div>

            <div style={s.cardGlass}>
              <div style={s.cardGlow}></div>
              <div style={s.cardContent}>
                <div style={s.cardIcon}>📧</div>
                <h3 style={s.cardTitle}>Email Automation</h3>
                <p style={s.cardDesc}>
                  Candidate updates, rejection letters, offer letters—all sent automatically
                  with personalized messaging.
                </p>
              </div>
            </div>

            <div style={s.cardGlass}>
              <div style={s.cardGlow}></div>
              <div style={s.cardContent}>
                <div style={s.cardIcon}>🔄</div>
                <h3 style={s.cardTitle}>Onboarding Workflows</h3>
                <p style={s.cardDesc}>
                  Paperwork, compliance forms, training schedules—automated end-to-end.
                  New hires start productive on day one.
                </p>
              </div>
            </div>

            <div style={s.cardGlass}>
              <div style={s.cardGlow}></div>
              <div style={s.cardContent}>
                <div style={s.cardIcon}>📊</div>
                <h3 style={s.cardTitle}>Analytics Dashboard</h3>
                <p style={s.cardDesc}>
                  Real-time insights on hiring pipeline, candidate quality, time-to-hire,
                  and team performance metrics.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Roadmap */}
        <section id="roadmap" style={s.roadmap}>
          <div style={s.sectionHeader}>
            <div style={s.roadmapBadge}>🚀 Product Roadmap</div>
            <h2 style={s.sectionTitle}>Our Mission: Replace HR Departments</h2>
            <p style={s.sectionSub}>
              We&apos;re building a complete platform that eliminates the need for traditional HR teams.
              Here&apos;s what&apos;s coming next.
            </p>
          </div>

          <div style={s.timeline}>
            <div style={s.timelineItem}>
              <div style={s.timelineBadge}>Q2 2026</div>
              <div style={s.timelineCardGlass}>
                <h3 style={s.timelineTitle}>Intelligent Screening & Communication</h3>
                <ul style={s.timelineList}>
                  <li>AI-powered resume parsing and ranking</li>
                  <li>Automated interview scheduling with calendar integration</li>
                  <li>Smart email campaigns (rejection, offer, follow-up)</li>
                  <li>Candidate chat bot for instant answers</li>
                </ul>
              </div>
            </div>

            <div style={s.timelineItem}>
              <div style={s.timelineBadge}>Q3 2026</div>
              <div style={s.timelineCardGlass}>
                <h3 style={s.timelineTitle}>Full ATS Replacement</h3>
                <ul style={s.timelineList}>
                  <li>Applicant tracking system with job board integrations</li>
                  <li>Automated offer letter generation & e-signatures</li>
                  <li>Background check coordination & status tracking</li>
                  <li>Complete onboarding workflow automation</li>
                </ul>
              </div>
            </div>

            <div style={s.timelineItem}>
              <div style={s.timelineBadge}>Q4 2026</div>
              <div style={s.timelineCardGlass}>
                <h3 style={s.timelineTitle}>Employee Lifecycle Management</h3>
                <ul style={s.timelineList}>
                  <li>Payroll & benefits administration automation</li>
                  <li>Performance review scheduling & tracking</li>
                  <li>AI HR chatbot for employee questions</li>
                  <li>Workforce planning & headcount forecasting</li>
                </ul>
              </div>
            </div>

            <div style={s.timelineItem}>
              <div style={s.timelineBadge}>2027+</div>
              <div style={s.timelineCardGlass}>
                <h3 style={s.timelineTitle}>Complete HR Platform</h3>
                <ul style={s.timelineList}>
                  <li>Zero-HR company enablement (full automation)</li>
                  <li>Compliance automation (EEOC, GDPR, labor laws)</li>
                  <li>Global workforce management</li>
                  <li>Advanced AI for talent strategy & succession planning</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section style={s.cta}>
          <h2 style={s.ctaTitle}>Ready to eliminate manual HR work?</h2>
          <p style={s.ctaSub}>
            Join companies already saving hundreds of hours per month with automated hiring.
          </p>
          <div style={s.ctaActions}>
            <Link href="/employer/register" style={s.btnPrimary}>Start Free Trial</Link>
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
                  <div style={s.brandTextTop}>Holland Systems</div>
                  <div style={s.brandTextSub}>Automate HR. Replace manual work.</div>
                </div>
              </div>
              <p style={{marginTop: 12, opacity: 0.7, fontSize: 14}}>
                The intelligent platform for companies ready to automate their entire HR department.
              </p>
            </div>
            <div style={s.footerLinks}>
              <div>
                <h4 style={s.footerLinkTitle}>Product</h4>
                <Link href="#platform" style={s.footerLink}>Features</Link>
                <Link href="#roadmap" style={s.footerLink}>Roadmap</Link>
                <Link href="/employer/analytics" style={s.footerLink}>Analytics</Link>
              </div>
              <div>
                <h4 style={s.footerLinkTitle}>Company</h4>
                <Link href="#" style={s.footerLink}>About</Link>
                <Link href="#" style={s.footerLink}>Contact</Link>
                <Link href="#" style={s.footerLink}>Privacy</Link>
              </div>
            </div>
          </div>
          <div style={s.footerBottom}>
            © 2025 Holland Systems. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    background: "#0a0a0f",
    color: "#ffffff",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    position: "relative" as const,
    overflow: "hidden" as const,
  },

  // Animated Background
  backgroundContainer: {
    position: "fixed" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    overflow: "hidden",
  },

  gradientOrb1: {
    position: "absolute" as const,
    top: "-20%",
    right: "-10%",
    width: 900,
    height: 900,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(99, 102, 241, 0.4) 0%, rgba(99, 102, 241, 0) 70%)",
    filter: "blur(80px)",
    animation: "float 20s ease-in-out infinite",
  },

  gradientOrb2: {
    position: "absolute" as const,
    bottom: "-20%",
    left: "-10%",
    width: 800,
    height: 800,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, rgba(139, 92, 246, 0) 70%)",
    filter: "blur(80px)",
    animation: "float 25s ease-in-out infinite reverse",
  },

  gradientOrb3: {
    position: "absolute" as const,
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: 700,
    height: 700,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(59, 130, 246, 0.25) 0%, rgba(59, 130, 246, 0) 70%)",
    filter: "blur(80px)",
    animation: "pulse 15s ease-in-out infinite",
  },

  gridOverlay: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: `
      linear-gradient(rgba(99, 102, 241, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(99, 102, 241, 0.03) 1px, transparent 1px)
    `,
    backgroundSize: "50px 50px",
    pointerEvents: "none" as const,
  },
  
  container: { 
    maxWidth: 1400, 
    margin: "0 auto", 
    padding: "0 32px",
    position: "relative" as const,
    zIndex: 1,
  },
  
  navWrap: {
    position: "sticky" as const,
    top: 0,
    zIndex: 100,
    background: "rgba(15, 15, 25, 0.7)",
    backdropFilter: "blur(20px) saturate(180%)",
    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
  },
  
  nav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 0",
    gap: 16,
  },
  
  brand: { 
    display: "flex", 
    alignItems: "center", 
    gap: 12, 
    textDecoration: "none", 
    color: "inherit" 
  },
  
  logo: {
    width: 42,
    height: 42,
    borderRadius: 12,
    background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
    color: "#fff",
    display: "grid",
    placeItems: "center",
    fontWeight: 900,
    fontSize: 16,
    letterSpacing: 0.5,
    boxShadow: "0 0 30px rgba(99, 102, 241, 0.6)",
  },
  
  brandTextTop: { 
    fontSize: 16, 
    fontWeight: 900, 
    letterSpacing: 0.2, 
    lineHeight: 1.2,
    color: "#ffffff",
  },

  brandTextSub: { 
    fontSize: 12, 
    color: "rgba(255, 255, 255, 0.6)", 
    marginTop: 2 
  },
  
  navLinks: { 
    display: "flex", 
    alignItems: "center", 
    gap: 12, 
    flexWrap: "wrap" as const 
  },
  
  link: {
    color: "rgba(255, 255, 255, 0.8)",
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 600,
    padding: "8px 16px",
    borderRadius: 8,
    transition: "all 0.2s",
  },
  
  linkPrimary: {
    background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
    color: "#fff",
    boxShadow: "0 0 20px rgba(99, 102, 241, 0.4)",
    padding: "8px 20px",
    borderRadius: 10,
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 700,
  },
  
  linkOutline: {
    border: "1px solid rgba(255, 255, 255, 0.2)",
    background: "rgba(255, 255, 255, 0.05)",
    backdropFilter: "blur(10px)",
    color: "#ffffff",
    padding: "8px 20px",
    borderRadius: 10,
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 700,
  },
  
  hero: {
    padding: "100px 0 80px",
    position: "relative" as const,
    zIndex: 1,
  },

  heroGlass: {
    background: "rgba(255, 255, 255, 0.03)",
    backdropFilter: "blur(20px) saturate(180%)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: 32,
    padding: "60px 48px",
    textAlign: "center" as const,
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
  },

  heroIconFloat: {
    display: "inline-block",
    marginBottom: 24,
    animation: "float 3s ease-in-out infinite",
  },

  heroIcon: {
    fontSize: 72,
    filter: "drop-shadow(0 0 30px rgba(99, 102, 241, 0.9))",
  },
  
  heroTitle: {
    fontSize: 64,
    fontWeight: 900,
    lineHeight: 1.1,
    margin: "0 auto",
    maxWidth: 900,
    letterSpacing: -2,
  },
  
  gradient: {
    backgroundImage: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  
  heroSub: {
    fontSize: 20,
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: 24,
    maxWidth: 700,
    margin: "24px auto 0",
    lineHeight: 1.6,
  },
  
  heroActions: {
    display: "flex",
    gap: 16,
    justifyContent: "center",
    marginTop: 40,
    flexWrap: "wrap" as const,
  },
  
  btnPrimary: {
    padding: "16px 36px",
    borderRadius: 14,
    background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 700,
    fontSize: 16,
    display: "inline-block",
    boxShadow: "0 4px 20px rgba(99, 102, 241, 0.5)",
    transition: "all 0.3s",
  },
  
  btnSecondary: {
    padding: "16px 36px",
    borderRadius: 14,
    border: "1px solid rgba(255, 255, 255, 0.2)",
    color: "#ffffff",
    textDecoration: "none",
    fontWeight: 700,
    fontSize: 16,
    display: "inline-block",
    background: "rgba(255, 255, 255, 0.05)",
    backdropFilter: "blur(10px)",
    transition: "all 0.3s",
  },
  
  stats: {
    display: "flex",
    gap: 24,
    justifyContent: "center",
    marginTop: 60,
    flexWrap: "wrap" as const,
  },
  
  statGlass: {
    padding: "28px 40px",
    borderRadius: 20,
    background: "rgba(255, 255, 255, 0.04)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    textAlign: "center" as const,
    minWidth: 180,
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
  },
  
  statValue: {
    fontSize: 52,
    fontWeight: 900,
    backgroundImage: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    marginBottom: 8,
  },
  
  statLabel: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.6)",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "1px",
  },
  
  features: {
    padding: "100px 0",
    position: "relative" as const,
    zIndex: 1,
  },
  
  sectionHeader: {
    textAlign: "center" as const,
    marginBottom: 64,
  },
  
  sectionTitle: {
    fontSize: 48,
    fontWeight: 900,
    margin: 0,
    letterSpacing: -1.5,
    color: "#ffffff",
  },
  
  sectionSub: {
    fontSize: 18,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 16,
    maxWidth: 600,
    margin: "16px auto 0",
  },
  
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
    gap: 28,
  },
  
  cardGlass: {
    position: "relative" as const,
    padding: 36,
    borderRadius: 24,
    background: "rgba(255, 255, 255, 0.04)",
    backdropFilter: "blur(20px) saturate(180%)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
    overflow: "hidden",
  },

  cardGlow: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.15), transparent 50%)",
    opacity: 0,
    transition: "opacity 0.4s",
    pointerEvents: "none" as const,
  },

  cardContent: {
    position: "relative" as const,
    zIndex: 1,
  },
  
  cardIcon: {
    fontSize: 48,
    marginBottom: 20,
    filter: "drop-shadow(0 0 10px rgba(99, 102, 241, 0.5))",
  },
  
  cardTitle: {
    fontSize: 22,
    fontWeight: 800,
    margin: "0 0 12px 0",
    color: "#ffffff",
    letterSpacing: "-0.5px",
  },
  
  cardDesc: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.7)",
    lineHeight: 1.6,
    margin: 0,
  },
  
  roadmap: {
    padding: "100px 0",
    position: "relative" as const,
    zIndex: 1,
  },

  roadmapBadge: {
    display: "inline-block",
    padding: "10px 24px",
    borderRadius: 24,
    background: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)",
    fontSize: 14,
    fontWeight: 800,
    marginBottom: 24,
    boxShadow: "0 0 30px rgba(139, 92, 246, 0.6)",
    textTransform: "uppercase" as const,
    letterSpacing: "1px",
  },
  
  timeline: {
    maxWidth: 1000,
    margin: "0 auto",
  },
  
  timelineItem: {
    display: "flex",
    gap: 28,
    marginBottom: 40,
    alignItems: "flex-start",
  },
  
  timelineBadge: {
    padding: "10px 20px",
    borderRadius: 24,
    background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
    color: "#fff",
    fontWeight: 800,
    fontSize: 14,
    whiteSpace: "nowrap" as const,
    flexShrink: 0,
    boxShadow: "0 4px 16px rgba(99, 102, 241, 0.4)",
  },
  
  timelineCardGlass: {
    flex: 1,
    padding: 32,
    background: "rgba(255, 255, 255, 0.04)",
    backdropFilter: "blur(20px)",
    borderRadius: 20,
    border: "1px solid rgba(255, 255, 255, 0.1)",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
  },
  
  timelineTitle: {
    fontSize: 22,
    fontWeight: 800,
    margin: "0 0 16px 0",
    color: "#ffffff",
  },
  
  timelineList: {
    margin: 0,
    padding: "0 0 0 20px",
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 15,
    lineHeight: 1.8,
  },
  
  cta: {
    padding: "100px 0",
    textAlign: "center" as const,
    position: "relative" as const,
    zIndex: 1,
  },
  
  ctaTitle: {
    fontSize: 48,
    fontWeight: 900,
    margin: 0,
    letterSpacing: -1.5,
    color: "#ffffff",
  },
  
  ctaSub: {
    fontSize: 18,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 16,
    maxWidth: 600,
    margin: "16px auto 0",
  },
  
  ctaActions: {
    display: "flex",
    gap: 16,
    justifyContent: "center",
    marginTop: 40,
    flexWrap: "wrap" as const,
  },
  
  footer: {
    background: "rgba(15, 15, 25, 0.8)",
    backdropFilter: "blur(20px)",
    borderTop: "1px solid rgba(255, 255, 255, 0.1)",
    color: "rgba(255, 255, 255, 0.7)",
    padding: "60px 0 32px",
    position: "relative" as const,
    zIndex: 1,
  },
  
  footerContent: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: 48,
    marginBottom: 32,
  },
  
  footerLinks: {
    display: "flex",
    gap: 48,
  },
  
  footerLinkTitle: {
    fontSize: 14,
    fontWeight: 800,
    color: "#fff",
    marginBottom: 12,
  },
  
  footerLink: {
    display: "block",
    color: "rgba(255, 255, 255, 0.6)",
    textDecoration: "none",
    fontSize: 14,
    marginBottom: 8,
    transition: "color 0.3s",
  },
  
  footerBottom: {
    paddingTop: 24,
    borderTop: "1px solid rgba(255, 255, 255, 0.1)",
    textAlign: "center" as const,
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.5)",
  },
};
