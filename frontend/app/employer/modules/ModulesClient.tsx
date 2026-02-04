"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CompanyLogo from '../../components/CompanyLogo';
import { apiClient } from '../../../lib/api-client';
import { LoadingState, ErrorState, EmptyState } from '../../../components/ui/StateComponents';

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
    icon: "RO",
    description: "Define positions with environment-first approach",
    href: "/employer/roles/create",
    badge: "Active",
    badgeColor: "var(--color-success)",
    available: true
  },
  {
    id: "candidates",
    name: "Candidate Review",
    icon: "CA",
    description: "Compare applicants with environment alignment",
    href: "/employer/dashboard",
    badge: "Active",
    badgeColor: "var(--color-success)",
    available: true
  },
  {
    id: "analytics",
    name: "Analytics Dashboard",
    icon: "AN",
    description: "Real-time insights on hiring pipeline",
    href: "/employer/analytics",
    badge: "Active",
    badgeColor: "var(--color-success)",
    available: true
  },
  {
    id: "calendar",
    name: "AI Interview Scheduling",
    icon: "AI",
    description: "Environment-aware automated scheduling",
    href: "/employer/calendar",
    badge: "Active",
    badgeColor: "var(--color-success)",
    available: true
  },
  {
    id: "teamfit",
    name: "Team Fit Prediction",
    icon: "TF",
    description: "Interaction stress analysis & team compatibility",
    href: "/employer/team-fit",
    badge: "Active",
    badgeColor: "var(--color-success)",
    available: true
  },
  {
    id: "builder",
    name: "Assessment Builder",
    icon: "AB",
    description: "Custom psychometric assessments with bias warnings",
    href: "/employer/assessment-builder",
    badge: "Active",
    badgeColor: "var(--color-success)",
    available: true
  },
  {
    id: "references",
    name: "Reference Checks",
    icon: "RC",
    description: "Automated reference verification workflows",
    href: "/employer/references",
    badge: "Beta",
    badgeColor: "var(--accent-blue)",
    available: true
  },
  {
    id: "compliance",
    name: "Compliance & Audit",
    icon: "CO",
    description: "Bias-aware audit trails and reporting",
    href: "/employer/compliance",
    badge: "Beta",
    badgeColor: "var(--accent-blue)",
    available: true
  },
  {
    id: "attrition",
    name: "Attrition Risk",
    icon: "AR",
    description: "Environment mismatch signals & preventative care",
    href: "/employer/attrition",
    badge: "Beta",
    badgeColor: "var(--accent-blue)",
    available: true
  }
];

const UPCOMING_MODULES: Module[] = [
  {
    id: "talent-pool",
    name: "Talent Pool CRM",
    icon: "TP",
    description: "Environment-based candidate re-matching and relationship intelligence",
    href: "#",
    badge: "Q2 2026",
    badgeColor: "var(--accent-lavender)",
    available: false
  },
  {
    id: "onboarding",
    name: "Smart Onboarding",
    icon: "SO",
    description: "Automated paperwork, compliance forms, and training workflows",
    href: "#",
    badge: "Q2 2026",
    badgeColor: "var(--accent-lavender)",
    available: false
  },
  {
    id: "video-ai",
    name: "AI Video Interviews",
    icon: "VI",
    description: "Automated video screening with sentiment and communication analysis",
    href: "#",
    badge: "Q3 2026",
    badgeColor: "var(--color-warning)",
    available: false
  },
  {
    id: "performance",
    name: "Performance Analytics",
    icon: "PA",
    description: "Continuous performance tracking and team health monitoring",
    href: "#",
    badge: "Q3 2026",
    badgeColor: "var(--color-warning)",
    available: false
  },
  {
    id: "global-hiring",
    name: "Global Workforce",
    icon: "GW",
    description: "Multi-region compliance, payroll, and talent management",
    href: "#",
    badge: "2027",
    badgeColor: "var(--text-tertiary)",
    available: false
  },
  {
    id: "ai-coach",
    name: "AI HR Coach",
    icon: "AC",
    description: "24/7 chatbot for employee questions and HR policy guidance",
    href: "#",
    badge: "2027",
    badgeColor: "var(--text-tertiary)",
    available: false
  }
];

export default function ModulesClient() {
  const [companyName, setCompanyName] = useState<string>("Your Company");
  const [activeTab, setActiveTab] = useState<"all" | "available" | "coming" | "favorites">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [statsAnimated, setStatsAnimated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favoriteModules, setFavoriteModules] = useState<Set<string>>(() => {
    // Initialize with localStorage data immediately if available
    if (typeof window !== 'undefined') {
      try {
        // First try localStorage
        let storedFavorites = localStorage.getItem('module-favorites');
        
        // If localStorage is empty, try sessionStorage backup
        if (!storedFavorites) {
          storedFavorites = sessionStorage.getItem('module-favorites-backup');
        }
        
        if (storedFavorites) {
          const parsed = JSON.parse(storedFavorites);
          if (Array.isArray(parsed)) {
            return new Set(parsed);
          }
        }
      } catch (e) {
        console.warn('Failed to parse stored favorites on init:', e);
      }
    }
    return new Set();
  });

  useEffect(() => {
    // Try to fetch company info
    async function fetchCompanyInfo() {
      try {
        setLoading(true);
        setError(null);
        
        const response = await apiClient.get('/api/employer/me');
        
        if (response.success && response.data) {
          setCompanyName(response.data?.company_name || response.data?.companyName || "Your Company");
        } else {
          console.warn('Failed to fetch company info:', response.error?.message);
          // Don't set error for company info fetch failure - use fallback
        }
      } catch (err) {
        console.warn('Error fetching company info:', err);
        // Don't set error for company info fetch failure - use fallback
      } finally {
        setLoading(false);
      }
    }
    
    fetchCompanyInfo();

    // Additional fallback to load favorites from localStorage
    // This ensures favorites are loaded even if the initial state didn't work
    if (favoriteModules.size === 0) {
      try {
        const storedFavorites = localStorage.getItem('module-favorites');
        if (storedFavorites) {
          const parsed = JSON.parse(storedFavorites);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setFavoriteModules(new Set(parsed));
          }
        }
      } catch (e) {
        console.warn('Failed to parse stored favorites in useEffect:', e);
      }
    }
  }, []);

  // Save favorites to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const favoritesArray = Array.from(favoriteModules);
        localStorage.setItem('module-favorites', JSON.stringify(favoritesArray));
        
        // Also save to sessionStorage as a backup
        sessionStorage.setItem('module-favorites-backup', JSON.stringify(favoritesArray));
      } catch (e) {
        console.error('Failed to save favorites:', e);
      }
    }
  }, [favoriteModules]);

  const retryFetch = () => {
    setError(null);
    setLoading(true);
    // Re-trigger the fetch by calling fetchCompanyInfo again
    (async () => {
      try {
        const response = await apiClient.get('/api/employer/me');
        
        if (response.success && response.data) {
          setCompanyName(response.data?.company_name || response.data?.companyName || "Your Company");
        } else {
          setError(response.error?.message || 'Failed to load company information');
        }
      } catch (err) {
        setError('Failed to load company information');
      } finally {
        setLoading(false);
      }
    })();
  };

  const toggleFavorite = (moduleId: string) => {
    setFavoriteModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
      }
      
      // Immediately save to localStorage to ensure persistence
      try {
        const favoritesArray = Array.from(newSet);
        localStorage.setItem('module-favorites', JSON.stringify(favoritesArray));
        sessionStorage.setItem('module-favorites-backup', JSON.stringify(favoritesArray));
      } catch (e) {
        console.error('Failed to save favorites immediately:', e);
      }
      
      return newSet;
    });
  };

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
    if (activeTab === "favorites" && !favoriteModules.has(m.id)) return false;
    
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
    <main style={s.page} className="texture-background">
      {/* Header */}
      <header style={s.header}>
        <div style={s.container}>
          <div style={s.headerContent}>
            <div style={s.branding}>
              <CompanyLogo size="md" variant="transparent" />
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
          <div style={s.heroGlass} className="texture-surface-2">
            <div style={s.heroContent}>
              <h2 style={s.heroTitle}>
                Your AI-Powered Hiring Command Center
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

      {/* Tabs Navigation */}
      <section style={s.tabsSection}>
        <div style={s.container}>
          <div style={s.tabs}>
            <button
              onClick={() => setActiveTab("all")}
              style={{
                ...s.tab,
                ...(activeTab === "all" ? s.tabActive : {})
              }}
            >
              All Modules
              {activeTab === "all" && <div style={s.tabIndicator} />}
            </button>
            <button
              onClick={() => setActiveTab("available")}
              style={{
                ...s.tab,
                ...(activeTab === "available" ? s.tabActive : {})
              }}
            >
              Available
              {activeTab === "available" && <div style={s.tabIndicator} />}
            </button>
            <button
              onClick={() => setActiveTab("coming")}
              style={{
                ...s.tab,
                ...(activeTab === "coming" ? s.tabActive : {})
              }}
            >
              Coming Soon
              {activeTab === "coming" && <div style={s.tabIndicator} />}
            </button>
            <button
              onClick={() => setActiveTab("favorites")}
              style={{
                ...s.tab,
                ...(activeTab === "favorites" ? s.tabActive : {})
              }}
            >
              ❤️ Favorites ({favoriteModules.size})
              {activeTab === "favorites" && <div style={s.tabIndicator} />}
            </button>
          </div>
        </div>
      </section>

      {/* Active Modules Section */}
      <section style={s.modulesSection}>
        <div style={s.container}>
          <div style={s.sectionHeader}>
            <h2 style={s.sectionTitle}>
              {activeTab === "favorites" ? "Your Favorite Modules" : 
               activeTab === "available" ? "Available Modules" :
               activeTab === "coming" ? "Coming Soon" :
               searchQuery || selectedCategory !== "All" ? "Filtered Results" : "Active Modules"}
            </h2>
            <p style={s.sectionDesc}>
              {filteredModules.length} {filteredModules.length === 1 ? "module" : "modules"} 
              {activeTab === "favorites" ? "in your favorites" : "available"}
            </p>
          </div>

          {/* Show error state if there's an error */}
          {error && (
            <ErrorState
              title="Failed to load modules"
              message={error}
              onRetry={retryFetch}
            />
          )}

          {/* Show loading state while loading */}
          {loading && !error && (
            <LoadingState 
              message="Loading your modules..." 
              size="large" 
              variant="dots"
            />
          )}

          {/* Show content when not loading and no error */}
          {!loading && !error && (
            <>
              <div style={s.grid}>
                {filteredModules.map((module, idx) => (
                  <TiltCard 
                    key={module.id} 
                    module={module} 
                    delay={idx * 0.1}
                    isFavorited={favoriteModules.has(module.id)}
                    onToggleFavorite={() => toggleFavorite(module.id)}
                  />
                ))}
              </div>
              
              {filteredModules.length === 0 && (
                <EmptyState
                  title="No modules found"
                  message="Try adjusting your search or filters to find the modules you're looking for."
                  icon="🔍"
                  actionLabel={searchQuery || selectedCategory !== "All" ? "Clear Filters" : undefined}
                  onAction={searchQuery || selectedCategory !== "All" ? () => {
                    setSearchQuery("");
                    setSelectedCategory("All");
                  } : undefined}
                />
              )}
            </>
          )}
        </div>
      </section>

      {/* Upcoming Modules Section */}
      {(activeTab === "all" || activeTab === "coming") && filteredUpcoming.length > 0 && (
        <section style={s.upcomingSection}>
          <div style={s.container}>
            <div style={s.sectionHeader}>
              <div style={s.roadmapBadge}>Roadmap</div>
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

// Module Card Component
function TiltCard({ 
  module, 
  delay, 
  isFavorited, 
  onToggleFavorite 
}: { 
  module: Module; 
  delay: number; 
  isFavorited: boolean;
  onToggleFavorite: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const CardWrapper = module.available ? Link : "div";
  const cardProps = module.available
    ? { href: module.href }
    : {};

  return (
    <CardWrapper {...cardProps as any}>
      <div 
        style={{
          ...s.cardGlass,
          animation: `fadeInUp 0.6s ease-out ${delay}s backwards`,
        }}
        className="texture-surface-2 texture-interactive"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div style={s.cardGlow}></div>
        
        {/* Favorite Button */}
        <button 
          style={{
            ...s.favoriteBtn,
            opacity: isHovered ? 1 : 0.6,
            transform: isHovered ? "scale(1.1)" : "scale(1)",
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleFavorite();
          }}
          title={isFavorited ? "Remove from favorites" : "Add to favorites"}
        >
          {isFavorited ? "❤️" : "🤍"}
        </button>
        
        <div style={s.cardContent}>
          <div style={s.cardHeader}>
            <div style={s.cardIconContainer}>
              <span style={s.cardIcon}>{module.icon}</span>
            </div>
            {module.badge && (
              <div style={{
                ...s.badge,
                background: `${module.badgeColor}15`,
                border: `1px solid ${module.badgeColor}40`,
                color: module.badgeColor
              }}>
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

// Upcoming Module Card Component
function UpcomingTiltCard({ module, delay }: { module: Module; delay: number }) {
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
        animation: `fadeInUp 0.6s ease-out ${delay}s backwards`,
      }}
    >
      <div style={s.upcomingCardContent}>
        <div style={s.cardHeader}>
          <div style={s.upcomingIconContainer}>
            <span style={s.cardIcon}>{module.icon}</span>
          </div>
          {module.badge && (
            <div style={{
              ...s.roadmapBadgeSmall,
              background: `${module.badgeColor}15`,
              border: `1px solid ${module.badgeColor}40`,
              color: module.badgeColor
            }}>
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
          Coming Soon
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
            <div style={{
              ...s.badge,
              background: `${module.badgeColor}15`,
              border: `1px solid ${module.badgeColor}40`,
              color: module.badgeColor
            }}>
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
            <div style={{
              ...s.upcomingBadgeSmall,
              background: `${module.badgeColor}15`,
              border: `1px solid ${module.badgeColor}40`,
              color: module.badgeColor
            }}>
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
    background: "var(--surface-0)",
    color: "var(--text-primary)",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    position: "relative" as const,
    overflow: "auto" as const,
    paddingBottom: "var(--space-16)",
  },

  container: {
    maxWidth: 1400,
    margin: "0 auto",
    padding: "0 var(--space-8)",
    position: "relative" as const,
    zIndex: 1,
  },

  header: {
    position: "sticky" as const,
    top: 0,
    zIndex: 100,
    background: "var(--surface-1)",
    borderBottom: "1px solid var(--border-subtle)",
    padding: "var(--space-5) 0",
  },

  headerContent: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "var(--space-6)",
    flexWrap: "wrap" as const,
  },

  branding: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-4)",
  },

  companyName: {
    margin: 0,
    fontSize: "var(--text-xl)",
    fontWeight: 600,
    color: "var(--text-primary)",
    letterSpacing: "-0.02em",
  },

  subtitle: {
    margin: "var(--space-1) 0 0 0",
    fontSize: "var(--text-sm)",
    color: "var(--text-secondary)",
    fontWeight: 500,
  },

  headerActions: {
    display: "flex",
    gap: "var(--space-3)",
    alignItems: "center",
  },

  btnGlass: {
    padding: "var(--space-3) var(--space-5)",
    borderRadius: 8,
    background: "var(--surface-2)",
    border: "1px solid var(--border-default)",
    color: "var(--text-primary)",
    textDecoration: "none",
    fontWeight: 500,
    fontSize: "var(--text-sm)",
    display: "inline-block",
    cursor: "pointer",
    transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
  },

  btnPrimary: {
    padding: "var(--space-3) var(--space-5)",
    borderRadius: 8,
    background: "var(--accent-blue-glow)",
    color: "var(--accent-blue)",
    border: "1px solid var(--accent-blue-dim)",
    fontWeight: 500,
    fontSize: "var(--text-sm)",
    cursor: "pointer",
    transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
  },

  // Hero Section
  hero: {
    padding: "var(--space-16) 0 var(--space-12)",
    position: "relative" as const,
    zIndex: 1,
  },

  heroGlass: {
    background: "var(--surface-2)",
    border: "1px solid var(--border-subtle)",
    borderRadius: 8,
    padding: "var(--space-12) var(--space-10)",
  },

  heroContent: {
    textAlign: "center" as const,
    maxWidth: 900,
    margin: "0 auto",
  },

  heroIconFloat: {
    display: "none",
  },

  heroIcon: {
    fontSize: 64,
  },

  heroTitle: {
    margin: 0,
    fontSize: 48,
    fontWeight: 600,
    letterSpacing: "-0.03em",
    lineHeight: 1.1,
    color: "var(--text-primary)",
  },

  heroText: {
    margin: "24px 0 0 0",
    fontSize: 18,
    color: "var(--text-secondary)",
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
    fontWeight: 600,
    color: "var(--accent-blue)",
  },

  heroStatLabel: {
    fontSize: 13,
    color: "var(--text-tertiary)",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
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
    fontWeight: 600,
    margin: "0 0 16px 0",
    letterSpacing: "-0.02em",
    color: "var(--text-primary)",
  },

  sectionDesc: {
    fontSize: 16,
    color: "var(--text-secondary)",
    maxWidth: 600,
    margin: "0 auto",
  },

  upcomingBadge: {
    display: "inline-block",
    padding: "8px 20px",
    borderRadius: 20,
    background: "var(--accent-lavender-glow)",
    border: "1px solid var(--accent-lavender-dim)",
    color: "var(--accent-lavender)",
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 20,
  },
  
  roadmapBadge: {
    display: "inline-block",
    padding: "8px 20px",
    borderRadius: 20,
    background: "var(--accent-lavender-glow)",
    border: "1px solid var(--accent-lavender-dim)",
    color: "var(--accent-lavender)",
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 20,
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
    borderRadius: 8,
    background: "var(--surface-2)",
    border: "1px solid var(--border-subtle)",
    textDecoration: "none",
    color: "inherit",
    display: "block",
    transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
    cursor: "pointer",
    overflow: "hidden",
  },

  cardGlow: {
    display: "none",
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
    marginBottom: "var(--space-5)",
  },

  cardIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 8,
    background: "var(--surface-3)",
    display: "grid",
    placeItems: "center",
    border: "1px solid var(--border-default)",
  },

  cardIcon: {
    fontSize: "var(--text-lg)",
    fontWeight: 600,
    color: "var(--text-primary)",
  },

  badge: {
    padding: "var(--space-1) var(--space-3)",
    borderRadius: 6,
    fontSize: "var(--text-xs)",
    fontWeight: 600,
    color: "var(--text-primary)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },

  cardTitle: {
    margin: "0 0 var(--space-3) 0",
    fontSize: "var(--text-lg)",
    fontWeight: 600,
    color: "var(--text-primary)",
    letterSpacing: "-0.01em",
  },

  cardDesc: {
    margin: 0,
    fontSize: "var(--text-sm)",
    color: "var(--text-secondary)",
    lineHeight: 1.6,
  },

  cardAction: {
    marginTop: "var(--space-5)",
    color: "var(--accent-blue)",
    fontSize: "var(--text-sm)",
    fontWeight: 500,
    display: "flex",
    alignItems: "center",
    gap: "var(--space-2)",
  },

  // Upcoming Cards
  upcomingCard: {
    position: "relative" as const,
    padding: "var(--space-8)",
    borderRadius: 8,
    background: "var(--surface-1)",
    border: "1px dashed var(--border-default)",
    transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
  },

  upcomingCardContent: {
    position: "relative" as const,
    zIndex: 1,
  },

  upcomingIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 8,
    background: "var(--surface-3)",
    display: "grid",
    placeItems: "center",
    border: "1px dashed var(--border-default)",
  },

  upcomingBadgeSmall: {
    padding: "6px 14px",
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 600,
    color: "var(--text-primary)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },

  upcomingStatus: {
    marginTop: 20,
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: "var(--text-tertiary)",
    fontSize: 13,
    fontWeight: 600,
  },

  upcomingDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "var(--accent-lavender)",
  },
  
  upcomingTag: {
    marginTop: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "10px 16px",
    background: "var(--surface-3)",
    border: "1px solid var(--border-default)",
    borderRadius: 8,
    color: "var(--text-secondary)",
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
    background: "var(--surface-2)",
    border: "1px solid var(--border-subtle)",
    borderRadius: 8,
    padding: "32px",
    textAlign: "center" as const,
  },

  footerText: {
    color: "var(--text-secondary)",
    fontSize: 14,
    margin: "0 0 8px 0",
  },

  footerCopy: {
    color: "var(--text-tertiary)",
    fontSize: 13,
    margin: 0,
  },

  footerLink: {
    color: "var(--accent-blue)",
    textDecoration: "none",
    fontWeight: 600,
    transition: "color 180ms cubic-bezier(0.4, 0, 0.2, 1)",
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
    background: "var(--surface-2)",
    border: "1px solid var(--border-default)",
    borderRadius: 8,
    padding: "16px 20px",
    transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
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
    color: "var(--text-primary)",
    fontSize: 16,
    fontWeight: 500,
  },
  
  clearBtn: {
    background: "var(--surface-3)",
    border: "1px solid var(--border-default)",
    borderRadius: 8,
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontSize: 16,
    padding: "4px 10px",
    transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
  },
  
  filterContainer: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap" as const,
    justifyContent: "center",
  },
  
  filterBtn: {
    background: "var(--surface-2)",
    border: "1px solid var(--border-default)",
    borderRadius: 999,
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
    padding: "10px 24px",
    transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
  },
  
  filterBtnActive: {
    background: "var(--accent-blue-glow)",
    border: "1px solid var(--accent-blue-dim)",
    color: "var(--accent-blue)",
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
    color: "var(--text-secondary)",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  
  progressValue: {
    fontSize: 14,
    color: "var(--text-primary)",
    fontWeight: 600,
  },
  
  progressBar: {
    height: 8,
    background: "var(--surface-3)",
    borderRadius: 999,
    overflow: "hidden",
    position: "relative" as const,
  },
  
  progressFill: {
    height: "100%",
    borderRadius: 999,
    transition: "width 1.5s ease-out",
    position: "relative" as const,
  },
  
  // Empty State
  emptyState: {
    textAlign: "center" as const,
    padding: "80px 20px",
  },
  
  emptyTitle: {
    fontSize: 24,
    fontWeight: 600,
    color: "var(--text-primary)",
    marginBottom: 12,
  },
  
  emptyText: {
    fontSize: 16,
    color: "var(--text-secondary)",
  },
  
  // Roadmap Badge Small
  roadmapBadgeSmall: {
    padding: "4px 12px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
    color: "var(--text-primary)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },

  // Tabs Section
  tabsSection: {
    background: "var(--surface-1)",
    borderBottom: "1px solid var(--border-subtle)",
    position: "sticky" as const,
    top: 0,
    zIndex: 10,
  },

  tabs: {
    display: "flex",
    gap: 0,
    overflowX: "auto" as const,
  },

  tab: {
    background: "transparent",
    border: "none",
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
    padding: "16px 24px",
    position: "relative" as const,
    transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
    whiteSpace: "nowrap" as const,
  },

  tabActive: {
    color: "var(--accent-blue)",
  },

  tabIndicator: {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    background: "var(--accent-blue)",
  },

  favoriteBtn: {
    position: "absolute" as const,
    top: 12,
    right: 12,
    background: "rgba(0, 0, 0, 0.6)",
    border: "none",
    borderRadius: "50%",
    color: "white",
    cursor: "pointer",
    fontSize: 16,
    width: 32,
    height: 32,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
    zIndex: 2,
    opacity: 0.8,
  },
};
