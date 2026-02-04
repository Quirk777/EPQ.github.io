import Link from 'next/link';

export default function HomePage() {
  const s = {
    page: {
      minHeight: "100vh",
      background:
        "radial-gradient(1200px 800px at 15% 15%, #e9f0ff 0%, transparent 60%)," +
        "radial-gradient(900px 650px at 85% 10%, #fff0f3 0%, transparent 55%)," +
        "radial-gradient(900px 600px at 30% 90%, #f2fff6 0%, transparent 55%)," +
        "#fbfbfd",
      padding: 0,
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
      color: "#0b1220",
    },
    container: { maxWidth: 1120, margin: "0 auto", padding: "0 18px" },
    navWrap: {
      position: "sticky",
      top: 0,
      zIndex: 50,
      background: "rgba(251,251,253,0.85)",
      backdropFilter: "blur(10px)",
      borderBottom: "1px solid rgba(0,0,0,0.08)",
    },
    nav: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "14px 0",
      gap: 14,
    },
    brand: { display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" },
    logo: {
      width: 38, height: 38, borderRadius: 14,
      background: "#111", color: "#fff",
      display: "grid", placeItems: "center",
      fontWeight: 900, letterSpacing: 0.5,
      boxShadow: "0 10px 22px rgba(0,0,0,0.12)"
    },
    brandTextTop: { fontSize: 14, fontWeight: 900, letterSpacing: 0.2, lineHeight: 1.1 },
    brandTextSub: { fontSize: 12, color: "#667085" },
    navLinks: { display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" },
    link: { color: "#334155", textDecoration: "none", fontSize: 13, fontWeight: 650, padding: "8px 10px", borderRadius: 10 },
    linkSoft: { background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.06)" },
    btn: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "10px 14px",
      borderRadius: 12,
      border: "1px solid rgba(0,0,0,0.18)",
      background: "#111",
      color: "#fff",
      fontWeight: 800,
      textDecoration: "none",
      boxShadow: "0 10px 22px rgba(0,0,0,0.10)",
      whiteSpace: "nowrap",
    },
    btnGhost: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "10px 14px",
      borderRadius: 12,
      border: "1px solid rgba(0,0,0,0.14)",
      background: "#fff",
      color: "#111",
      fontWeight: 800,
      textDecoration: "none",
      whiteSpace: "nowrap",
    },
    hero: { padding: "44px 0 22px" },
    heroGrid: { display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 18, alignItems: "center" },
    heroH1: { fontSize: 44, letterSpacing: -0.7, margin: "0 0 10px", lineHeight: 1.05 },
    heroP: { margin: 0, color: "#475569", fontSize: 16, lineHeight: 1.7 },
    heroCard: {
      borderRadius: 18,
      border: "1px solid rgba(0,0,0,0.08)",
      background: "rgba(255,255,255,0.72)",
      boxShadow: "0 18px 40px rgba(0,0,0,0.10)",
      padding: 16,
      backdropFilter: "blur(10px)",
    },
    heroMock: {
      borderRadius: 16,
      border: "1px solid rgba(0,0,0,0.08)",
      background: "linear-gradient(180deg, rgba(17,17,17,0.03), rgba(17,17,17,0.00))",
      padding: 14,
      overflow: "hidden",
    },
    badgeRow: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 },
    badge: {
      display: "inline-flex",
      gap: 8,
      alignItems: "center",
      padding: "8px 10px",
      borderRadius: 999,
      border: "1px solid rgba(0,0,0,0.10)",
      background: "rgba(255,255,255,0.65)",
      color: "#0b1220",
      fontSize: 12,
      fontWeight: 750,
    },
    section: { padding: "26px 0" },
    sectionTitle: { fontSize: 22, margin: "0 0 12px", letterSpacing: -0.2 },
    sectionSub: { margin: "0 0 18px", color: "#475569", lineHeight: 1.7 },
    grid3: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 },
    card: {
      borderRadius: 16,
      border: "1px solid rgba(0,0,0,0.08)",
      background: "rgba(255,255,255,0.75)",
      boxShadow: "0 12px 26px rgba(0,0,0,0.08)",
      padding: 16,
      backdropFilter: "blur(10px)",
    },
    cardH: { fontWeight: 900, margin: "0 0 6px" },
    cardP: { margin: 0, color: "#475569", lineHeight: 1.65, fontSize: 14 },
    pricingGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 },
    price: { fontSize: 28, fontWeight: 950, letterSpacing: -0.4, margin: "8px 0 6px" },
    small: { fontSize: 12, color: "#64748b", margin: 0 },
    ul: { margin: "12px 0 0", paddingLeft: 18, color: "#334155", lineHeight: 1.8, fontSize: 13 },
    footer: {
      marginTop: 18,
      padding: "22px 0",
      borderTop: "1px solid rgba(0,0,0,0.08)",
      color: "#64748b",
      fontSize: 12,
      background: "rgba(255,255,255,0.40)",
    },
    footerGrid: { display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 14 },
    footerLink: { color: "#475569", textDecoration: "none", display: "block", marginTop: 8, fontWeight: 650 },
    pill: {
      display: "inline-flex",
      padding: "4px 10px",
      borderRadius: 999,
      border: "1px solid rgba(0,0,0,0.12)",
      background: "rgba(255,255,255,0.70)",
      fontSize: 12,
      fontWeight: 750,
      color: "#0b1220"
    }
  } as const;

  return (
    <main style={s.page}>
      <div style={s.navWrap}>
        <div style={s.container}>
          <div style={s.nav}>
            <Link href="/" style={s.brand}>
              <div style={s.logo}>EPQ</div>
              <div>
                <div style={s.brandTextTop}>EnviroFit</div>
                <div style={s.brandTextSub}>Workplace fit, explained.</div>
              </div>
            </Link>

            <div style={s.navLinks}>
              <a href="#features" style={s.link}>Features</a>
              <a href="#how" style={s.link}>How it works</a>
              <a href="#pricing" style={s.link}>Pricing</a>
              <a href="/employer/help" style={{ ...s.link, ...s.linkSoft }}>Help</a>
              <a href="/employer/login" style={s.btnGhost}>Login</a>
              <a href="/employer/signup" style={s.btn}>Get Started</a>
            </div>
          </div>
        </div>
      </div>

      <section style={s.hero}>
        <div style={s.container}>
          <div style={s.heroGrid}>
            <div>
              <div style={s.pill}>Hiring + onboarding intelligence</div>
              <h1 style={s.heroH1}>
                Optimize workplace fit,
                <span style={{ color: "#2563eb" }}> without guesswork</span>
              </h1>
              <p style={s.heroP}>
                EnviroFit uses environment-first assessments to translate candidate responses into
                role-relevant insights. Generate a clean employer report focused on environmental fit, onboarding guidance,
                and practical interview prompts.
              </p>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
                <a href="/employer/signup" style={s.btn}>Get Started Free</a>
                <a href="/employer/login" style={s.btnGhost}>Employer Login</a>
              </div>

              <div style={s.badgeRow}>
                <div style={s.badge}> Assessment links</div>
                <div style={s.badge}>📄 PDF reports</div>
                <div style={s.badge}>🧭 Environment fit focus</div>
              </div>
            </div>

            <div style={s.heroCard}>
              <div style={{ fontWeight: 950, marginBottom: 10 }}>Preview</div>
              <div style={s.heroMock}>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr",
                  gap: 10
                }}>
                  <div style={{ ...s.card, boxShadow: "none", background: "rgba(255,255,255,0.85)" }}>
                    <div style={{ fontWeight: 900 }}>Employee Assessment</div>
                    <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>Construct averages + report generation</div>
                    <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                      {["Structural Clarity", "Change Volatility", "Autonomy & Judgment"].map((t, i) => (
                        <div key={t} style={{ display: "grid", gridTemplateColumns: "1fr 80px", gap: 10, alignItems: "center" }}>
                          <div style={{ fontSize: 13, fontWeight: 750, color: "#334155" }}>{t}</div>
                          <div style={{
                            height: 10, borderRadius: 999,
                            background: "rgba(37,99,235,0.15)",
                            overflow: "hidden",
                            border: "1px solid rgba(0,0,0,0.06)"
                          }}>
                            <div style={{
                              height: "100%",
                              width: `${65 + i * 10}%`,
                              background: "rgba(37,99,235,0.85)"
                            }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ ...s.card, boxShadow: "none", background: "rgba(255,255,255,0.85)" }}>
                    <div style={{ fontWeight: 900 }}>Employer Report</div>
                    <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
                      Fit summary, strengths, onboarding plan, and interview prompts
                    </div>
                    <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <span style={s.pill}>Fit score</span>
                      <span style={s.pill}>PDF download</span>
                      <span style={s.pill}>Onboarding</span>
                      <span style={s.pill}>Prompts</span>
                    </div>
                  </div>

                  <div style={{ ...s.card, boxShadow: "none", background: "rgba(255,255,255,0.85)" }}>
                    <div style={{ fontWeight: 900 }}>Dashboard</div>
                    <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
                      Submissions grouped by recency with statuses
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 12, color: "#64748b", fontSize: 12 }}>
                This is a prototype UI preview (your real dashboard is already working).
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" style={s.section}>
        <div style={s.container}>
          <h2 style={s.sectionTitle}>Measure workplace alignment</h2>
          <p style={s.sectionSub}>
            Understand how people operate in a specific environment. Use the results to screen, match, and onboard with clarity.
          </p>
          <div style={s.grid3}>
            <div style={s.card}>
              <div style={s.cardH}>Role-aligned assessment</div>
              <p style={s.cardP}>Employers define the environment. Applicants answer contextual questions aligned to that environment.</p>
            </div>
            <div style={s.card}>
              <div style={s.cardH}>Actionable employer report</div>
              <p style={s.cardP}>PDF output translates construct averages into strengths, mitigations, and interview prompts.</p>
            </div>
            <div style={s.card}>
              <div style={s.cardH}>Faster onboarding</div>
              <p style={s.cardP}>Includes a 30-60-90 day plan and training guidance, framed positively and practically.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="how" style={s.section}>
        <div style={s.container}>
          <h2 style={s.sectionTitle}>How it works</h2>
          <p style={s.sectionSub}>A simple flow that stays focused on the employer’s environment.</p>

          <div style={s.grid3}>
            <div style={s.card}>
              <div style={s.cardH}>1) Create an assessment</div>
              <p style={s.cardP}>Log in and create a role environment profile. You’ll get a shareable applicant link.</p>
            </div>
            <div style={s.card}>
              <div style={s.cardH}>2) Applicants submit</div>
              <p style={s.cardP}>Applicants answer the EPQ. Submissions are stored and queued for PDF generation.</p>
            </div>
            <div style={s.card}>
              <div style={s.cardH}>3) Review results</div>
              <p style={s.cardP}>Dashboard shows status and provides “View PDF” for each candidate.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" style={s.section}>
        <div style={s.container}>
          <h2 style={s.sectionTitle}>Pricing</h2>
          <p style={s.sectionSub}>
            Prototype pricing (placeholder). You’ll hook up real billing later. For now, we gate access behind a “subscription active” flag.
          </p>

          <div style={s.pricingGrid}>
            <div style={s.card}>
              <div style={s.cardH}>Starter</div>
              <div style={s.price}>$0</div>
              <p style={s.small}>For testing and demos</p>
              <ul style={s.ul}>
                <li>1 active assessment</li>
                <li>Basic dashboard</li>
                <li>PDF generation</li>
              </ul>
              <div style={{ marginTop: 14 }}>
                <a href="/employer/signup" style={s.btn}>Get Started</a>
              </div>
            </div>

            <div style={{ ...s.card, border: "1px solid rgba(37,99,235,0.35)" }}>
              <div style={s.cardH}>Pro</div>
              <div style={s.price}>$49</div>
              <p style={s.small}>For small teams</p>
              <ul style={s.ul}>
                <li>Unlimited assessments</li>
                <li>Recency grouping</li>
                <li>Priority PDF queue</li>
              </ul>
              <div style={{ marginTop: 14 }}>
                <a href="/employer/signup" style={s.btn}>Start Pro</a>
              </div>
            </div>

            <div style={s.card}>
              <div style={s.cardH}>Enterprise</div>
              <div style={s.price}>Talk to us</div>
              <p style={s.small}>For org-wide adoption</p>
              <ul style={s.ul}>
                <li>Custom workflows</li>
                <li>SLAs + support</li>
                <li>Advanced reporting</li>
              </ul>
              <div style={{ marginTop: 14 }}>
                <a href="/employer/help" style={s.btnGhost}>Contact</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={s.section}>
        <div style={s.container}>
          <div style={{ ...s.card, padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 950, fontSize: 18 }}>Get started with data-driven workplace optimization</div>
                <div style={{ color: "#475569", marginTop: 6, lineHeight: 1.6 }}>
                  Log in to create your first assessment and send an applicant link.
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <a href="/employer/login" style={s.btnGhost}>Login</a>
                <a href="/employer/signup" style={s.btn}>Get Started</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer style={s.footer}>
        <div style={s.container}>
          <div style={s.footerGrid}>
            <div>
              <div style={{ fontWeight: 950, color: "#0b1220" }}>EnviroFit</div>
              <div style={{ marginTop: 8, lineHeight: 1.6 }}>
                Environment-first hiring assessment prototype.
                Reports focus on fit, onboarding, and actionability.
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 900, color: "#0b1220" }}>Product</div>
              <a href="#features" style={s.footerLink}>Features</a>
              <a href="#how" style={s.footerLink}>How it works</a>
              <a href="#pricing" style={s.footerLink}>Pricing</a>
            </div>

            <div>
              <div style={{ fontWeight: 900, color: "#0b1220" }}>Employer</div>
              <a href="/employer/login" style={s.footerLink}>Login</a>
              <a href="/employer/dashboard" style={s.footerLink}>Dashboard</a>
              <a href="/employer/epq" style={s.footerLink}>Create assessment</a>
            </div>

            <div>
              <div style={{ fontWeight: 900, color: "#0b1220" }}>Help</div>
              <a href="/employer/help" style={s.footerLink}>Support</a>
              <a href="/employer/help#contact" style={s.footerLink}>Contact</a>
              <a href="/employer/help#status" style={s.footerLink}>Troubleshooting</a>
            </div>
          </div>

          <div style={{ marginTop: 14, color: "#94a3b8" }}>
            © {new Date().getFullYear()} EnviroFit • Local prototype build
          </div>
        </div>
      </footer>
    </main>
  );
}
