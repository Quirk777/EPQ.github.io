"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const LOGO_KEY = "epq_company_logo_v1";

type Module = {
  id: string;
  name: string;
  icon: string;
  description: string;
  href: string;
  badge?: string;
  badgeColor?: string;
  available: boolean;
};

const MODULES: Module[] = [
  {
    id: "roles",
    name: "Role Setup",
    icon: "🎯",
    description: "Define positions with environment-first approach",
    href: "/employer/roles/create",
    badge: "Active",
    badgeColor: "#10b981",
    available: true
  },
  {
    id: "candidates",
    name: "Candidate Review",
    icon: "👥",
    description: "Compare applicants with environment alignment",
    href: "/employer/dashboard",
    badge: "Active",
    badgeColor: "#10b981",
    available: true
  },
  {
    id: "analytics",
    name: "Analytics Dashboard",
    icon: "📊",
    description: "Real-time insights on hiring pipeline",
    href: "/employer/analytics",
    badge: "Active",
    badgeColor: "#10b981",
    available: true
  },
  {
    id: "calendar",
    name: "AI Interview Scheduling",
    icon: "📅",
    description: "Environment-aware automated scheduling",
    href: "/employer/calendar",
    badge: "Active",
    badgeColor: "#10b981",
    available: true
  },
  {
    id: "teamfit",
    name: "Team Fit Prediction",
    icon: "🤝",
    description: "Interaction stress analysis & team compatibility",
    href: "/employer/team-fit",
    badge: "Active",
    badgeColor: "#10b981",
    available: true
  },
  {
    id: "builder",
    name: "Assessment Builder",
    icon: "📝",
    description: "Custom psychometric assessments with bias warnings",
    href: "/employer/assessment-builder",
    badge: "Active",
    badgeColor: "#10b981",
    available: true
  },
  {
    id: "references",
    name: "Reference Checks",
    icon: "✅",
    description: "Automated reference verification workflows",
    href: "/employer/references",
    badge: "Beta",
    badgeColor: "#3b82f6",
    available: true
  },
  {
    id: "compliance",
    name: "Compliance & Audit",
    icon: "🛡️",
    description: "Bias-aware audit trails and reporting",
    href: "/employer/compliance",
    badge: "Beta",
    badgeColor: "#3b82f6",
    available: true
  },
  {
    id: "attrition",
    name: "Attrition Risk",
    icon: "⚠️",
    description: "Environment mismatch signals & preventative care",
    href: "/employer/attrition",
    badge: "Beta",
    badgeColor: "#3b82f6",
    available: true
  }
];

const UPCOMING_MODULES: Module[] = [
  {
    id: "talent-pool",
    name: "Talent Pool CRM",
    icon: "💎",
    description: "Environment-based candidate re-matching and relationship intelligence",
    href: "#",
    badge: "Q2 2026",
    badgeColor: "#8b5cf6",
    available: false
  },
  {
    id: "onboarding",
    name: "Smart Onboarding",
    icon: "🚀",
    description: "Automated paperwork, compliance forms, and training workflows",
    href: "#",
    badge: "Q2 2026",
    badgeColor: "#8b5cf6",
    available: false
  },
  {
    id: "video-ai",
    name: "AI Video Interviews",
    icon: "🎥",
    description: "Automated video screening with sentiment and communication analysis",
    href: "#",
    badge: "Q3 2026",
    badgeColor: "#f59e0b",
    available: false
  },
  {
    id: "performance",
    name: "Performance Analytics",
    icon: "📈",
    description: "Continuous performance tracking and team health monitoring",
    href: "#",
    badge: "Q3 2026",
    badgeColor: "#f59e0b",
    available: false
  },
  {
    id: "global-hiring",
    name: "Global Workforce",
    icon: "🌍",
    description: "Multi-region compliance, payroll, and talent management",
    href: "#",
    badge: "2027",
    badgeColor: "#64748b",
    available: false
  },
  {
    id: "ai-coach",
    name: "AI HR Coach",
    icon: "🤖",
    description: "24/7 chatbot for employee questions and HR policy guidance",
    href: "#",
    badge: "2027",
    badgeColor: "#64748b",
    available: false
  }
];

export default function ModulesClient() {
  const [logo, setLogo] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>("Your Company");
  const [activeTab, setActiveTab] = useState<"all" | "available" | "coming">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [statsAnimated, setStatsAnimated] = useState(false);

  useEffect(() => {
    try {
      const storedLogo = localStorage.getItem(LOGO_KEY);
      setLogo(storedLogo);
    } catch {}

    // Try to fetch company info
    async function fetchCompanyInfo() {
      try {
        const res = await fetch("/api/employer/me", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setCompanyName(data?.company_name || data?.companyName || "Your Company");
        }
      } catch {}
    }
    fetchCompanyInfo();
  }, []);

  // Categories for filtering
  const categories = ["All", "AI Powered", "Analytics", "Recruitment", "Team Management"];
  
  const getModuleCategory = (module: Module): string => {
    if (module.name.includes("AI") || module.name.includes("Team Fit") || module.name.includes("Video")) return "AI Powered";
    if (module.name.includes("Analytics") || module.name.includes("Performance")) return "Analytics";
    if (module.name.includes("Role") || module.name.includes("Candidate") || module.name.includes("Interview") || module.name.includes("Reference")) return "Recruitment";
    return "Team Management";
  };

  const filteredModules = MODULES.filter(m => {
    // Tab filter
    if (activeTab === "available" && !m.available) return false;
    if (activeTab === "coming" && m.available) return false;
    
    // Search filter
    if (searchQuery && !m.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !m.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    
    // Category filter
    if (selectedCategory !== "All" && getModuleCategory(m) !== selectedCategory) return false;
    
    return true;
  });
  
  const filteredUpcoming = UPCOMING_MODULES.filter(m => {
    if (searchQuery && !m.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !m.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (selectedCategory !== "All" && getModuleCategory(m) !== selectedCategory) return false;
    return true;
  });

  return (
    <main style={s.page}>
      {/* Header */}
      <header style={s.header}>
        <div style={s.container}>
          <div style={s.headerContent}>
            <div style={s.branding}>
              {logo ? (
                <div style={s.logoBox}>
                  <img src={logo} alt="Company logo" style={s.logoImg} />
                </div>
              ) : (
                <div style={s.logoPlaceholder}>
                  {companyName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <h1 style={s.companyName}>{companyName}</h1>
                <p style={s.subtitle}>Enterprise Talent Intelligence Platform</p>
              </div>
            </div>

            <div style={s.headerActions}>
              <Link href="/employer/dashboard" style={s.btnGlass}>
                Home
              </Link>
              <Link href="/employer/profile" style={s.btnGlass}>
                Settings
              </Link>
              <button style={s.btnPrimary} onClick={() => window.location.href = '/api/employer/logout'}>
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section style={s.hero}>
        <div style={s.container}>
          <div style={s.heroGlass}>
            <div style={s.heroContent}>
              <h2 style={s.heroTitle}>
                Your AI-Powered <span style={s.gradient}>Hiring Command Center</span>
              </h2>
              <p style={s.heroText}>
                Intelligent automation meets human insight. Manage your entire talent pipeline with environment-aware AI, 
                bias detection, and world-class analytics.
              </p>
              
              {/* Animated Stats */}
              <div style={s.heroStats}>
                <AnimatedStat targetValue={9} label="Active Modules" suffix="" />
                <AnimatedStat targetValue={6} label="Coming Soon" suffix="" />
                <AnimatedStat targetValue={96} label="Time Saved" suffix="%" />
              </div>
            </div>
          </div>
          
          {/* Search & Filters */}
          <div style={s.controlsContainer}>
            {/* Search Bar */}
            <div style={s.searchContainer}>
              <input
                type="text"
                placeholder="Search modules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={s.searchInput}
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  style={s.clearBtn}
                >
                  ✕
                </button>
              )}
            </div>
            
            {/* Category Filters */}
            <div style={s.filterContainer}>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    ...s.filterBtn,
                    ...(selectedCategory === cat ? s.filterBtnActive : {})
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Active Modules Section */}
      <section style={s.modulesSection}>
        <div style={s.container}>
          <div style={s.sectionHeader}>
            <h2 style={s.sectionTitle}>
              {searchQuery || selectedCategory !== "All" ? "Filtered Results" : "Active Modules"}
            </h2>
            <p style={s.sectionDesc}>
              {filteredModules.length} {filteredModules.length === 1 ? "module" : "modules"} available
            </p>
          </div>
          
          <div style={s.grid}>
            {filteredModules.map((module, idx) => (
              <TiltCard key={module.id} module={module} delay={idx * 0.1} />
            ))}
          </div>
          
          {filteredModules.length === 0 && (
            <div style={s.emptyState}>
              <div style={s.emptyIcon}>🔍</div>
              <div style={s.emptyTitle}>No modules found</div>
              <div style={s.emptyText}>Try adjusting your search or filters</div>
            </div>
          )}
        </div>
      </section>

      {/* Upcoming Modules Section */}
      {(activeTab === "all" || activeTab === "coming") && filteredUpcoming.length > 0 && (
        <section style={s.upcomingSection}>
          <div style={s.container}>
            <div style={s.sectionHeader}>
              <div style={s.roadmapBadge}>🚀 Roadmap</div>
              <h2 style={s.sectionTitle}>Coming Soon</h2>
              <p style={s.sectionDesc}>
                Next-generation features in active development. Building the future of intelligent hiring.
              </p>
            </div>
            
            <div style={s.grid}>
              {filteredUpcoming.map((module, idx) => (
                <UpcomingTiltCard key={module.id} module={module} delay={idx * 0.1} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer - Glassmorphism */}
      <footer style={s.footer}>
        <div style={s.container}>
          <div style={s.footerGlass}>
            <p style={s.footerText}>
              <strong>Need help?</strong> <Link href="#" style={s.footerLink}>Documentation</Link> ·{" "}
              <Link href="#" style={s.footerLink}>Support</Link> ·{" "}
              <Link href="#" style={s.footerLink}>API Reference</Link>
            </p>
            <p style={s.footerCopy}>© 2026 Holland Systems · Enterprise Talent Intelligence</p>
          </div>
        </div>
      </footer>
    </main>
  );
}

// Animated Stats Counter Component
function AnimatedStat({ targetValue, label, suffix }: { targetValue: number; label: string; suffix: string }) {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    let start = 0;
    const duration = 2000; // 2 seconds
    const increment = targetValue / (duration / 16); // 60fps
    
    const timer = setInterval(() => {
      start += increment;
      if (start >= targetValue) {
        setCount(targetValue);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    
    return () => clearInterval(timer);
  }, [targetValue]);
  
  return (
    <div style={s.heroStat}>
      <span style={s.heroStatValue}>{count}{suffix}</span>
      <span style={s.heroStatLabel}>{label}</span>
    </div>
  );
}

// 3D Tilt Card Component
function TiltCard({ module, delay }: { module: Module; delay: number }) {
  const [transform, setTransform] = useState("");
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = ((y - centerY) / centerY) * -10; // Max 10deg tilt
    const rotateY = ((x - centerX) / centerX) * 10;
    
    setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`);
  };
  
  const handleMouseLeave = () => {
    setTransform("");
  };
  
  const CardWrapper = module.available ? Link : "div";
  const cardProps = module.available
    ? { href: module.href }
    : {};

  return (
    <CardWrapper {...cardProps as any}>
      <div 
        style={{
          ...s.cardGlass,
          transform: transform,
          transition: transform ? "transform 0.1s ease-out" : "transform 0.3s ease-out",
          animation: `fadeInUp 0.6s ease-out ${delay}s backwards`,
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div style={s.cardGlow}></div>
        <div style={s.cardContent}>
          <div style={s.cardHeader}>
            <div style={s.cardIconContainer}>
              <span style={s.cardIcon}>{module.icon}</span>
            </div>
            {module.badge && (
              <div style={{...s.badge, background: module.badgeColor}}>
                {module.badge}
              </div>
            )}
          </div>
          <h3 style={s.cardTitle}>{module.name}</h3>
          <p style={s.cardDesc}>{module.description}</p>
          {module.available && (
            <div style={s.cardAction}>
              Launch Module →
            </div>
          )}
        </div>
      </div>
    </CardWrapper>
  );
}

// 3D Tilt Card for Upcoming Modules with Progress
function UpcomingTiltCard({ module, delay }: { module: Module; delay: number }) {
  const [transform, setTransform] = useState("");
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = ((y - centerY) / centerY) * -10;
    const rotateY = ((x - centerX) / centerX) * 10;
    
    setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`);
  };
  
  const handleMouseLeave = () => {
    setTransform("");
  };
  
  // Calculate progress based on quarter
  const getProgress = (badge: string) => {
    if (badge === "Q2 2026") return 65;
    if (badge === "Q3 2026") return 35;
    return 15;
  };
  
  const progress = getProgress(module.badge || "");
  
  return (
    <div 
      style={{
        ...s.upcomingCard,
        transform: transform,
        transition: transform ? "transform 0.1s ease-out" : "transform 0.3s ease-out",
        animation: `fadeInUp 0.6s ease-out ${delay}s backwards`,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div style={s.upcomingCardContent}>
        <div style={s.cardHeader}>
          <div style={s.upcomingIconContainer}>
            <span style={s.cardIcon}>{module.icon}</span>
          </div>
          {module.badge && (
            <div style={{...s.roadmapBadgeSmall, background: module.badgeColor}}>
              {module.badge}
            </div>
          )}
        </div>
        <h3 style={s.cardTitle}>{module.name}</h3>
        <p style={s.cardDesc}>{module.description}</p>
        
        {/* Progress Bar */}
        <div style={s.progressContainer}>
          <div style={s.progressHeader}>
            <span style={s.progressLabel}>Development Progress</span>
            <span style={s.progressValue}>{progress}%</span>
          </div>
          <div style={s.progressBar}>
            <div style={{
              ...s.progressFill,
              width: `${progress}%`,
              background: module.badgeColor
            }}></div>
          </div>
        </div>
        
        <div style={s.upcomingTag}>
          <span style={s.bellIcon}>🔔</span> Coming Soon
        </div>
      </div>
    </div>
  );
}

function ModuleCard({ module }: { module: Module }) {
  const CardWrapper = module.available ? Link : "div";
  const cardProps = module.available
    ? { href: module.href, style: s.cardGlass }
    : { style: {...s.cardGlass, ...s.cardDisabled} };

  return (
    <CardWrapper {...cardProps as any}>
      <div style={s.cardGlow}></div>
      <div style={s.cardContent}>
        <div style={s.cardHeader}>
          <div style={s.cardIconContainer}>
            <span style={s.cardIcon}>{module.icon}</span>
          </div>
          {module.badge && (
            <div style={{...s.badge, background: module.badgeColor}}>
              {module.badge}
            </div>
          )}
        </div>
        <h3 style={s.cardTitle}>{module.name}</h3>
        <p style={s.cardDesc}>{module.description}</p>
        {module.available && (
          <div style={s.cardAction}>
            Launch Module →
          </div>
        )}
      </div>
    </CardWrapper>
  );
}

function UpcomingModuleCard({ module }: { module: Module }) {
  return (
    <div style={s.upcomingCard}>
      <div style={s.upcomingCardContent}>
        <div style={s.cardHeader}>
          <div style={s.upcomingIconContainer}>
            <span style={s.cardIcon}>{module.icon}</span>
          </div>
          {module.badge && (
            <div style={{...s.upcomingBadgeSmall, background: module.badgeColor}}>
              {module.badge}
            </div>
          )}
        </div>
        <h3 style={s.cardTitle}>{module.name}</h3>
        <p style={s.cardDesc}>{module.description}</p>
        <div style={s.upcomingStatus}>
          <div style={s.upcomingDot}></div>
          <span>In Development</span>
        </div>
      </div>
    </div>
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
    width: 800,
    height: 800,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(99, 102, 241, 0.4) 0%, rgba(99, 102, 241, 0) 70%)",
    filter: "blur(80px)",
    animation: "float 20s ease-in-out infinite",
  },

  gradientOrb2: {
    position: "absolute" as const,
    bottom: "-20%",
    left: "-10%",
    width: 700,
    height: 700,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, rgba(139, 92, 246, 0) 70%)",
    filter: "blur(80px)",
    animation: "float 25s ease-in-out infinite reverse",
  },

  gradientOrb3: {
    position: "absolute" as const,
    top: "40%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: 600,
    height: 600,
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

  // Glassmorphism Header
  header: {
    position: "sticky" as const,
    top: 0,
    zIndex: 100,
    background: "rgba(15, 15, 25, 0.7)",
    backdropFilter: "blur(20px) saturate(180%)",
    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
    padding: "20px 0",
  },

  headerContent: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 24,
    flexWrap: "wrap" as const,
  },

  branding: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },

  logoBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    overflow: "hidden",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    background: "rgba(255, 255, 255, 0.05)",
    backdropFilter: "blur(10px)",
    flexShrink: 0,
  },

  logoImg: {
    width: "100%",
    height: "100%",
    objectFit: "contain" as const,
  },

  logoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 16,
    background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
    color: "#fff",
    display: "grid",
    placeItems: "center",
    fontWeight: 900,
    fontSize: 20,
    flexShrink: 0,
    boxShadow: "0 0 30px rgba(99, 102, 241, 0.5)",
  },

  companyName: {
    margin: 0,
    fontSize: 24,
    fontWeight: 900,
    color: "#ffffff",
    letterSpacing: "-0.5px",
  },

  subtitle: {
    margin: "4px 0 0 0",
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.6)",
    fontWeight: 500,
  },

  headerActions: {
    display: "flex",
    gap: 12,
    alignItems: "center",
  },

  btnGlass: {
    padding: "10px 20px",
    borderRadius: 12,
    background: "rgba(255, 255, 255, 0.05)",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    color: "#ffffff",
    textDecoration: "none",
    fontWeight: 600,
    fontSize: 14,
    display: "inline-block",
    cursor: "pointer",
    transition: "all 0.3s",
  },

  btnPrimary: {
    padding: "10px 24px",
    borderRadius: 12,
    background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
    color: "#fff",
    border: "none",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    boxShadow: "0 0 20px rgba(99, 102, 241, 0.4)",
    transition: "all 0.3s",
  },

  // Hero Section - Glassmorphism
  hero: {
    padding: "80px 0 60px",
    position: "relative" as const,
    zIndex: 1,
  },

  heroGlass: {
    background: "rgba(255, 255, 255, 0.03)",
    backdropFilter: "blur(20px) saturate(180%)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: 32,
    padding: "60px 48px",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
  },

  heroContent: {
    textAlign: "center" as const,
    maxWidth: 900,
    margin: "0 auto",
  },

  heroIconFloat: {
    display: "inline-block",
    marginBottom: 24,
    animation: "float 3s ease-in-out infinite",
  },

  heroIcon: {
    fontSize: 64,
    filter: "drop-shadow(0 0 20px rgba(99, 102, 241, 0.8))",
  },

  heroTitle: {
    margin: 0,
    fontSize: 48,
    fontWeight: 900,
    letterSpacing: "-1.5px",
    lineHeight: 1.1,
  },

  gradient: {
    backgroundImage: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },

  heroText: {
    margin: "24px 0 0 0",
    fontSize: 18,
    color: "rgba(255, 255, 255, 0.7)",
    lineHeight: 1.7,
    maxWidth: 700,
    marginLeft: "auto",
    marginRight: "auto",
  },

  heroStats: {
    display: "flex",
    gap: 48,
    justifyContent: "center",
    marginTop: 48,
    flexWrap: "wrap" as const,
  },

  heroStat: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: 8,
  },

  heroStatValue: {
    fontSize: 42,
    fontWeight: 900,
    backgroundImage: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },

  heroStatLabel: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.5)",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "1px",
  },

  // Sections
  modulesSection: {
    padding: "80px 0",
    position: "relative" as const,
    zIndex: 1,
  },

  upcomingSection: {
    padding: "80px 0 120px",
    position: "relative" as const,
    zIndex: 1,
  },

  sectionHeader: {
    textAlign: "center" as const,
    marginBottom: 64,
  },

  sectionTitle: {
    fontSize: 40,
    fontWeight: 900,
    margin: "0 0 16px 0",
    letterSpacing: "-1px",
  },

  sectionDesc: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.6)",
    maxWidth: 600,
    margin: "0 auto",
  },

  upcomingBadge: {
    display: "inline-block",
    padding: "8px 20px",
    borderRadius: 20,
    background: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)",
    fontSize: 13,
    fontWeight: 800,
    marginBottom: 20,
    boxShadow: "0 0 30px rgba(139, 92, 246, 0.5)",
  },
  
  roadmapBadge: {
    display: "inline-block",
    padding: "8px 20px",
    borderRadius: 20,
    background: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)",
    fontSize: 13,
    fontWeight: 800,
    marginBottom: 20,
    boxShadow: "0 0 30px rgba(139, 92, 246, 0.5)",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
    gap: 28,
  },

  // Glassmorphism Cards
  cardGlass: {
    position: "relative" as const,
    padding: 32,
    borderRadius: 24,
    background: "rgba(255, 255, 255, 0.04)",
    backdropFilter: "blur(20px) saturate(180%)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    textDecoration: "none",
    color: "inherit",
    display: "block",
    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
    cursor: "pointer",
    overflow: "hidden",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
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

  cardDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },

  cardIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    background: "rgba(255, 255, 255, 0.05)",
    backdropFilter: "blur(10px)",
    display: "grid",
    placeItems: "center",
    border: "1px solid rgba(255, 255, 255, 0.1)",
  },

  cardIcon: {
    fontSize: 32,
  },

  badge: {
    padding: "6px 14px",
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 800,
    color: "#fff",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
  },

  cardTitle: {
    margin: "0 0 12px 0",
    fontSize: 22,
    fontWeight: 800,
    color: "#ffffff",
    letterSpacing: "-0.5px",
  },

  cardDesc: {
    margin: 0,
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    lineHeight: 1.6,
  },

  cardAction: {
    marginTop: 20,
    color: "#6366f1",
    fontSize: 14,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },

  // Upcoming Cards
  upcomingCard: {
    position: "relative" as const,
    padding: 32,
    borderRadius: 24,
    background: "rgba(255, 255, 255, 0.02)",
    backdropFilter: "blur(20px)",
    border: "1px dashed rgba(255, 255, 255, 0.15)",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.15)",
    transition: "all 0.4s",
  },

  upcomingCardContent: {
    position: "relative" as const,
    zIndex: 1,
  },

  upcomingIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    background: "rgba(255, 255, 255, 0.03)",
    display: "grid",
    placeItems: "center",
    border: "1px dashed rgba(255, 255, 255, 0.1)",
  },

  upcomingBadgeSmall: {
    padding: "6px 14px",
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 800,
    color: "#fff",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
  },

  upcomingStatus: {
    marginTop: 20,
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: 13,
    fontWeight: 600,
  },

  upcomingDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#8b5cf6",
    boxShadow: "0 0 8px rgba(139, 92, 246, 0.8)",
    animation: "pulse 2s ease-in-out infinite",
  },
  
  upcomingTag: {
    marginTop: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "10px 16px",
    background: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 13,
    fontWeight: 600,
  },
  
  bellIcon: {
    fontSize: 16,
  },

  // Footer
  footer: {
    padding: "40px 0",
    position: "relative" as const,
    zIndex: 1,
  },

  footerGlass: {
    background: "rgba(255, 255, 255, 0.03)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: 20,
    padding: "32px",
    textAlign: "center" as const,
  },

  footerText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 14,
    margin: "0 0 8px 0",
  },

  footerCopy: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: 13,
    margin: 0,
  },

  footerLink: {
    color: "#6366f1",
    textDecoration: "none",
    fontWeight: 600,
    transition: "color 0.3s",
  },
  
  // Search & Filter Controls
  controlsContainer: {
    marginTop: 40,
    display: "flex",
    flexDirection: "column" as const,
    gap: 20,
  },
  
  searchContainer: {
    position: "relative" as const,
    display: "flex",
    alignItems: "center",
    background: "rgba(255, 255, 255, 0.05)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: 16,
    padding: "16px 20px",
    transition: "all 0.3s ease",
  },
  
  searchIcon: {
    fontSize: 20,
    marginRight: 12,
    opacity: 0.6,
  },
  
  searchInput: {
    flex: 1,
    background: "transparent",
    border: "none",
    outline: "none",
    color: "#ffffff",
    fontSize: 16,
    fontWeight: 500,
  },
  
  clearBtn: {
    background: "rgba(255, 255, 255, 0.1)",
    border: "none",
    borderRadius: 8,
    color: "rgba(255, 255, 255, 0.7)",
    cursor: "pointer",
    fontSize: 16,
    padding: "4px 10px",
    transition: "all 0.2s ease",
  },
  
  filterContainer: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap" as const,
    justifyContent: "center",
  },
  
  filterBtn: {
    background: "rgba(255, 255, 255, 0.05)",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: 999,
    color: "rgba(255, 255, 255, 0.7)",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
    padding: "10px 24px",
    transition: "all 0.3s ease",
  },
  
  filterBtnActive: {
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    border: "1px solid rgba(99, 102, 241, 0.5)",
    color: "#ffffff",
    boxShadow: "0 4px 20px rgba(99, 102, 241, 0.4)",
  },
  
  // Progress Bars
  progressContainer: {
    marginTop: 20,
  },
  
  progressHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  
  progressLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
  },
  
  progressValue: {
    fontSize: 14,
    color: "#ffffff",
    fontWeight: 700,
  },
  
  progressBar: {
    height: 8,
    background: "rgba(255, 255, 255, 0.1)",
    borderRadius: 999,
    overflow: "hidden",
    position: "relative" as const,
  },
  
  progressFill: {
    height: "100%",
    borderRadius: 999,
    transition: "width 1.5s ease-out",
    boxShadow: "0 0 20px currentColor",
    position: "relative" as const,
  },
  
  // Empty State
  emptyState: {
    textAlign: "center" as const,
    padding: "80px 20px",
  },
  
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
    opacity: 0.3,
    animation: "float 3s ease-in-out infinite",
  },
  
  emptyTitle: {
    fontSize: 24,
    fontWeight: 900,
    color: "#ffffff",
    marginBottom: 12,
  },
  
  emptyText: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.5)",
  },
  
  // Roadmap Badge Small
  roadmapBadgeSmall: {
    padding: "4px 12px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    color: "#ffffff",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    boxShadow: "0 0 20px currentColor",
  },
};
