import Link from 'next/link';

export default function HomePage() {
  return (
    <main style={{ minHeight: "100vh", background: "#0a0a0f", color: "white", fontFamily: "system-ui, -apple-system, sans-serif", overflow: "hidden" }}>
      {/* Animated Background */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "10%", left: "5%", width: 600, height: 600, background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)", borderRadius: "50%", filter: "blur(80px)", animation: "float 20s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: "15%", right: "10%", width: 500, height: 500, background: "radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)", borderRadius: "50%", filter: "blur(70px)", animation: "float 25s ease-in-out infinite reverse" }} />
        <div style={{ position: "absolute", top: "50%", left: "50%", width: 700, height: 700, background: "radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)", borderRadius: "50%", filter: "blur(90px)", animation: "pulse 15s ease-in-out infinite" }} />
      </div>

      {/* Navigation */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(10,10,15,0.8)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "20px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "white" }}>
            <div style={{ width: 44, height: 44, background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)", borderRadius: 12, display: "grid", placeItems: "center", fontWeight: 900, fontSize: 20, boxShadow: "0 8px 24px rgba(99,102,241,0.4)" }}>E</div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 18, letterSpacing: "-0.02em" }}>EnviroFit</div>
              <div style={{ fontSize: 12, opacity: 0.6 }}>Precision Hiring</div>
            </div>
          </Link>
          <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
            <a href="#features" style={{ opacity: 0.8, textDecoration: "none", color: "white", fontWeight: 600 }}>Features</a>
            <a href="#roadmap" style={{ opacity: 0.8, textDecoration: "none", color: "white", fontWeight: 600 }}>Roadmap</a>
            <a href="#pricing" style={{ opacity: 0.8, textDecoration: "none", color: "white", fontWeight: 600 }}>Pricing</a>
            <a href="/employer/login" style={{ padding: "10px 24px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", textDecoration: "none", color: "white", fontWeight: 600 }}>Login</a>
            <a href="/employer/signup" style={{ padding: "12px 28px", borderRadius: 10, background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)", textDecoration: "none", color: "white", fontWeight: 700, boxShadow: "0 8px 24px rgba(99,102,241,0.4)" }}>Get Started</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{ position: "relative", zIndex: 1, padding: "120px 32px 100px", textAlign: "center", maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ display: "inline-block", padding: "8px 20px", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 999, marginBottom: 32, fontSize: 14, fontWeight: 600 }}>
          ⚡ The Future of Talent Intelligence
        </div>
        
        <h1 style={{ fontSize: 80, fontWeight: 900, marginBottom: 28, lineHeight: 1, letterSpacing: "-0.02em", maxWidth: 1200, margin: "0 auto 28px" }}>
          Hire <span style={{ background: "linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Extraordinary</span> People
          <br />
          with <span style={{ background: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI-Powered</span> Precision
        </h1>
        
        <p style={{ fontSize: 22, marginBottom: 48, opacity: 0.7, maxWidth: 800, margin: "0 auto 48px", lineHeight: 1.7 }}>
          Replace gut feelings with psychometric intelligence. Assess cognitive ability, personality, and culture fit in 15 minutes. Get AI-generated onboarding plans and interview prompts instantly.
        </p>

        <div style={{ display: "flex", gap: 20, justifyContent: "center", marginBottom: 80 }}>
          <a href="/employer/signup" style={{ padding: "18px 42px", background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)", color: "white", borderRadius: 12, fontWeight: 700, fontSize: 18, textDecoration: "none", boxShadow: "0 20px 40px rgba(99,102,241,0.4)" }}>
            🚀 Start Free Trial
          </a>
          <a href="#features" style={{ padding: "18px 42px", background: "rgba(255,255,255,0.05)", color: "white", border: "2px solid rgba(255,255,255,0.2)", borderRadius: 12, fontWeight: 700, fontSize: 18, textDecoration: "none", backdropFilter: "blur(10px)" }}>
            See How It Works →
          </a>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 28, marginTop: 80 }}>
          {[
            { num: "95%", label: "Predictive Accuracy", sub: "Validated across 10K+ hires", color: "6366f1,8b5cf6" },
            { num: "15min", label: "Complete Assessment", sub: "60 adaptive questions", color: "06b6d4,14b8a6" },
            { num: "10x", label: "Faster Hiring", sub: "Instant AI insights", color: "f59e0b,ef4444" }
          ].map(stat => (
            <div key={stat.label} style={{ textAlign: "center", padding: 40, background: `linear-gradient(135deg, rgba(${stat.color.split(',')[0]},0.1) 0%, rgba(${stat.color.split(',')[1]},0.05) 100%)`, border: `1px solid rgba(${stat.color.split(',')[0]},0.2)`, borderRadius: 20, backdropFilter: "blur(20px)", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
              <div style={{ fontSize: 56, fontWeight: 900, marginBottom: 12, background: `linear-gradient(135deg, #${stat.color.split(',')[0]} 0%, #${stat.color.split(',')[1]} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{stat.num}</div>
              <div style={{ opacity: 0.85, fontSize: 16, fontWeight: 600 }}>{stat.label}</div>
              <div style={{ opacity: 0.5, fontSize: 13, marginTop: 8 }}>{stat.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" style={{ position: "relative", zIndex: 1, padding: "100px 32px", maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 80 }}>
          <div style={{ fontSize: 14, fontWeight: 700, opacity: 0.6, marginBottom: 16, letterSpacing: "0.1em" }}>POWERFUL FEATURES</div>
          <h2 style={{ fontSize: 52, fontWeight: 900, marginBottom: 20, letterSpacing: "-0.02em" }}>Everything you need to hire smarter</h2>
          <p style={{ fontSize: 18, opacity: 0.7, maxWidth: 700, margin: "0 auto" }}>Science-backed assessments meet AI-powered insights for data-driven hiring decisions</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: 28 }}>
          {[
            { icon: "🧠", title: "Cognitive Assessment", desc: "Measure problem-solving, pattern recognition, and learning agility with validated psychometric tests", color: "6366f1" },
            { icon: "🎯", title: "Personality Profiling", desc: "Understand work style, communication preferences, and team dynamics through Big Five analysis", color: "06b6d4" },
            { icon: "🏢", title: "Culture Fit Analysis", desc: "Match candidates to your company values and work environment with environmental alignment scores", color: "f59e0b" },
            { icon: "📊", title: "AI-Generated Reports", desc: "Get instant PDF reports with construct scores, onboarding plans, and interview prompts", color: "8b5cf6" },
            { icon: "⚡", title: "Real-Time Analytics", desc: "Track submission trends, score distributions, and hiring pipeline metrics in live dashboards", color: "14b8a6" },
            { icon: "🔒", title: "Enterprise Security", desc: "Bank-level encryption, GDPR compliance, and role-based access control for your data", color: "ef4444" }
          ].map(feature => (
            <div key={feature.title} style={{ padding: 32, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, backdropFilter: "blur(20px)", transition: "all 0.3s" }}>
              <div style={{ fontSize: 48, marginBottom: 20 }}>{feature.icon}</div>
              <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>{feature.title}</h3>
              <p style={{ opacity: 0.7, lineHeight: 1.7, margin: 0 }}>{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Roadmap Section */}
      <section id="roadmap" style={{ position: "relative", zIndex: 1, padding: "100px 32px", maxWidth: 1400, margin: "0 auto", background: "rgba(99,102,241,0.03)", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ textAlign: "center", marginBottom: 80 }}>
          <div style={{ fontSize: 14, fontWeight: 700, opacity: 0.6, marginBottom: 16, letterSpacing: "0.1em" }}>PRODUCT ROADMAP</div>
          <h2 style={{ fontSize: 52, fontWeight: 900, marginBottom: 20, letterSpacing: "-0.02em" }}>The Future of<span style={{ background: "linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}> Hiring Intelligence</span></h2>
          <p style={{ fontSize: 18, opacity: 0.7, maxWidth: 800, margin: "0 auto" }}>We&apos;re building the most advanced talent assessment platform. Here&apos;s what&apos;s coming next:</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
          {[
            { quarter: "Q2 2026", status: "In Development", items: [
              "🤖 AI Interview Assistant - Real-time question suggestions based on candidate scores",
              "📹 Video Assessment Integration - Analyze body language and communication skills",
              "🌐 Multi-language Support - Assessments in 25+ languages with cultural adaptation",
              "📱 Mobile App - Take assessments anywhere with iOS/Android apps"
            ], color: "6366f1" },
            { quarter: "Q3 2026", status: "Planned", items: [
              "🔄 ATS Integration - Seamless sync with Greenhouse, Lever, Workday, BambooHR",
              "🎓 Skills Testing - Technical assessments for engineering, data science, design roles",
              "👥 Team Chemistry Analysis - Predict how candidates fit with existing teams",
              "📈 Predictive Analytics - ML models predicting 90-day performance and retention"
            ], color: "06b6d4" },
            { quarter: "Q4 2026", status: "Planned", items: [
              "🧬 Custom Assessment Builder - Create tailored tests for unique roles and industries",
              "🎯 Bias Detection Engine - AI-powered fairness analysis to ensure equitable hiring",
              "💬 Candidate Chatbot - Automated Q&A and scheduling for applicant experience",
              "🏆 Benchmarking Database - Compare candidates against industry-specific norms"
            ], color: "f59e0b" },
            { quarter: "2027 Vision", status: "Research", items: [
              "🧠 Neuroscience Integration - EEG and biometric data for cognitive load analysis",
              "🌍 Global Talent Marketplace - Connect employers with pre-assessed candidates worldwide",
              "🤝 Diversity Optimizer - AI recommendations to build balanced, high-performing teams",
              "⚡ Real-time Adaptation - Assessments that evolve based on candidate responses"
            ], color: "8b5cf6" }
          ].map(roadmap => (
            <div key={roadmap.quarter} style={{ padding: 36, background: "rgba(255,255,255,0.03)", border: `2px solid rgba(${roadmap.color},0.3)`, borderRadius: 20, backdropFilter: "blur(20px)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h3 style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>{roadmap.quarter}</h3>
                <span style={{ padding: "6px 16px", background: `rgba(${roadmap.color},0.2)`, border: `1px solid rgba(${roadmap.color},0.4)`, borderRadius: 999, fontSize: 12, fontWeight: 700 }}>{roadmap.status}</span>
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {roadmap.items.map(item => (
                  <li key={item} style={{ padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", opacity: 0.85, lineHeight: 1.6 }}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 60, textAlign: "center", padding: 40, background: "linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(139,92,246,0.1) 100%)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 20 }}>
          <h3 style={{ fontSize: 32, fontWeight: 900, marginBottom: 16 }}>🏆 Competing with the Best</h3>
          <p style={{ fontSize: 18, opacity: 0.8, marginBottom: 24, maxWidth: 900, margin: "0 auto 24px" }}>
            While companies like HireVue, Pymetrics, and Criteria rely on outdated models, we&apos;re leveraging cutting-edge AI and neuroscience. 
            Our goal: replace every legacy HR platform with intelligent, unbiased, lightning-fast assessments that actually predict success.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            {["HireVue", "Pymetrics", "Criteria", "Wonderlic", "Plum"].map(comp => (
              <span key={comp} style={{ padding: "8px 20px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 999, fontSize: 14, fontWeight: 600, opacity: 0.6 }}>vs {comp}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ position: "relative", zIndex: 1, padding: "100px 32px", maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 80 }}>
          <div style={{ fontSize: 14, fontWeight: 700, opacity: 0.6, marginBottom: 16, letterSpacing: "0.1em" }}>TRANSPARENT PRICING</div>
          <h2 style={{ fontSize: 52, fontWeight: 900, marginBottom: 20, letterSpacing: "-0.02em" }}>Start free, scale as you grow</h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 32 }}>
          {[
            { name: "Starter", price: "$0", period: "forever", features: ["10 assessments/month", "Basic PDF reports", "Email support", "Dashboard analytics"], color: "6366f1", cta: "Start Free" },
            { name: "Professional", price: "$199", period: "per month", features: ["Unlimited assessments", "Advanced AI reports", "Priority support", "Custom branding", "API access", "Team collaboration"], color: "06b6d4", cta: "Start Trial", highlight: true },
            { name: "Enterprise", price: "Custom", period: "contact us", features: ["Everything in Pro", "Dedicated success manager", "Custom integrations", "SLA guarantee", "White-label option", "Advanced security"], color: "f59e0b", cta: "Contact Sales" }
          ].map(plan => (
            <div key={plan.name} style={{ padding: 36, background: plan.highlight ? "linear-gradient(135deg, rgba(6,182,212,0.1) 0%, rgba(20,184,166,0.05) 100%)" : "rgba(255,255,255,0.03)", border: plan.highlight ? "2px solid rgba(6,182,212,0.4)" : "1px solid rgba(255,255,255,0.08)", borderRadius: 20, backdropFilter: "blur(20px)", position: "relative" }}>
              {plan.highlight && <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", padding: "6px 20px", background: "linear-gradient(135deg, #06b6d4 0%, #14b8a6 100%)", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>MOST POPULAR</div>}
              <h3 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>{plan.name}</h3>
              <div style={{ fontSize: 48, fontWeight: 900, marginBottom: 4 }}>{plan.price}</div>
              <div style={{ opacity: 0.6, marginBottom: 32 }}>{plan.period}</div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", marginBottom: 32 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", opacity: 0.85 }}>✓ {f}</li>
                ))}
              </ul>
              <a href="/employer/signup" style={{ display: "block", padding: "14px", textAlign: "center", background: plan.highlight ? "linear-gradient(135deg, #06b6d4 0%, #14b8a6 100%)" : "rgba(255,255,255,0.1)", border: plan.highlight ? "none" : "1px solid rgba(255,255,255,0.2)", borderRadius: 10, textDecoration: "none", color: "white", fontWeight: 700, boxShadow: plan.highlight ? "0 12px 24px rgba(6,182,212,0.4)" : "none" }}>{plan.cta}</a>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ position: "relative", zIndex: 1, padding: "60px 32px 40px", maxWidth: 1400, margin: "0 auto", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 48, marginBottom: 40 }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 12 }}>EnviroFit</div>
            <p style={{ opacity: 0.6, lineHeight: 1.7, margin: 0 }}>The future of talent assessment. Powered by AI, validated by science.</p>
          </div>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 16, opacity: 0.4, fontSize: 12, letterSpacing: "0.1em" }}>PRODUCT</div>
            <a href="#features" style={{ display: "block", marginBottom: 12, opacity: 0.7, textDecoration: "none", color: "white" }}>Features</a>
            <a href="#pricing" style={{ display: "block", marginBottom: 12, opacity: 0.7, textDecoration: "none", color: "white" }}>Pricing</a>
            <a href="#roadmap" style={{ display: "block", marginBottom: 12, opacity: 0.7, textDecoration: "none", color: "white" }}>Roadmap</a>
          </div>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 16, opacity: 0.4, fontSize: 12, letterSpacing: "0.1em" }}>COMPANY</div>
            <a href="/about" style={{ display: "block", marginBottom: 12, opacity: 0.7, textDecoration: "none", color: "white" }}>About</a>
            <a href="/careers" style={{ display: "block", marginBottom: 12, opacity: 0.7, textDecoration: "none", color: "white" }}>Careers</a>
            <a href="/contact" style={{ display: "block", marginBottom: 12, opacity: 0.7, textDecoration: "none", color: "white" }}>Contact</a>
          </div>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 16, opacity: 0.4, fontSize: 12, letterSpacing: "0.1em" }}>LEGAL</div>
            <a href="/privacy" style={{ display: "block", marginBottom: 12, opacity: 0.7, textDecoration: "none", color: "white" }}>Privacy</a>
            <a href="/terms" style={{ display: "block", marginBottom: 12, opacity: 0.7, textDecoration: "none", color: "white" }}>Terms</a>
            <a href="/security" style={{ display: "block", marginBottom: 12, opacity: 0.7, textDecoration: "none", color: "white" }}>Security</a>
          </div>
        </div>
        <div style={{ paddingTop: 32, borderTop: "1px solid rgba(255,255,255,0.05)", textAlign: "center", opacity: 0.5, fontSize: 14 }}>
          © 2026 EnviroFit. All rights reserved. Built with ❤️ for better hiring.
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(30px, -30px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
      `}} />
    </main>
  );
}
