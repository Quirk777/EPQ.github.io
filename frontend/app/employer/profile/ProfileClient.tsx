"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from '../../../lib/api-client';
import { LoadingState, ErrorState } from '../../../components/ui/StateComponents';

const AVATAR_KEY = "epq_employer_avatar_v1";

type Tab = "profile" | "security" | "preferences" | "integrations" | "privacy";

export default function ProfileClient() {
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Profile data
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState<string | undefined>(undefined);
  const [companyName, setCompanyName] = useState("");
  const [timezone, setTimezone] = useState("America/Los_Angeles");
  const [language, setLanguage] = useState("English");
  
  // Security
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [lastLogin, setLastLogin] = useState<string | null>(null);
  
  // Two-Factor Authentication
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  // Preferences
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [weeklyInsights, setWeeklyInsights] = useState(true);
  const [instantAlerts, setInstantAlerts] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    try { 
      setAvatar(localStorage.getItem(AVATAR_KEY)); 
    } catch {}
  }, []);

  useEffect(() => {
    async function fetchProfileData() {
      try {
        setLoading(true);
        setErr(null);

        // Fetch employer profile data
        const response = await apiClient.get('/api/employer/me');
        
        if (response.success && response.data) {
          const data = response.data;
          setEmail(data?.email);
          setCompanyName(data?.company_name || data?.companyName || "");
          setFirstName(data?.first_name || data?.firstName || "");
          setLastName(data?.last_name || data?.lastName || "");
          setEmailVerified(data?.email_verified || data?.emailVerified || false);
          setLastLogin(data?.last_login || data?.lastLogin || null);
          setTwoFactorEnabled(data?.two_factor_enabled || false);
        } else {
          setErr(response.error?.message || 'Failed to load profile data');
        }

      } catch (e: unknown) {
        const error = e as Error;
        setErr(String(error?.message ?? error));
      } finally {
        setLoading(false);
      }
    }
    
    fetchProfileData();
  }, []);

  async function onPickPhoto(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const val = String(reader.result || "");
      try { localStorage.setItem(AVATAR_KEY, val); } catch {}
      setAvatar(val);
    };
    reader.readAsDataURL(file);
  }

  function clearPhoto() {
    try { localStorage.removeItem(AVATAR_KEY); } catch {}
    setAvatar(null);
  }

  const retryFetch = async () => {
    setErr(null);
    setLoading(true);
    
    try {
      const response = await apiClient.get('/api/employer/me');
      
      if (response.success && response.data) {
        const data = response.data;
        setEmail(data?.email);
        setCompanyName(data?.company_name || data?.companyName || "");
        setFirstName(data?.first_name || data?.firstName || "");
        setLastName(data?.last_name || data?.lastName || "");
        setEmailVerified(data?.email_verified || data?.emailVerified || false);
        setLastLogin(data?.last_login || data?.lastLogin || null);
        setTwoFactorEnabled(data?.two_factor_enabled || false);
      } else {
        setErr(response.error?.message || 'Failed to load profile data');
      }
    } catch (e: unknown) {
      const error = e as Error;
      setErr(String(error?.message ?? error));
    } finally {
      setLoading(false);
    }
  };

  async function saveProfile() {
    setSaveMessage(null);
    try {
      // API call would go here
      await new Promise(resolve => setTimeout(resolve, 500));
      setSaveMessage("Profile saved successfully");
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (e: unknown) {
      const error = e as Error;
      setSaveMessage(error?.message || "Failed to save");
    }
  }

  async function changePassword() {
    if (newPassword !== confirmPassword) {
      alert("Passwords don't match");
      return;
    }
    try {
      // API call would go here
      await new Promise(resolve => setTimeout(resolve, 500));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      alert("Password changed successfully");
    } catch (e: unknown) {
      const error = e as Error;
      alert(error?.message || "Failed to change password");
    }
  }

  async function resendVerification() {
    try {
      // API call would go here
      await new Promise(resolve => setTimeout(resolve, 500));
      alert("Verification email sent");
    } catch (e: unknown) {
      const error = e as Error;
      alert(error?.message || "Failed to send verification");
    }
  }

  async function setupTwoFactor() {
    try {
      const response = await apiClient.post("/api/employer/2fa/setup", {});
      
      if (response.success) {
        setQrCodeUrl(response.data.qr_code);
        setBackupCodes(response.data.backup_codes || []);
        setShowQRCode(true);
      } else {
        alert(response.error?.message || "Failed to set up two-factor authentication");
      }
    } catch (e: unknown) {
      const error = e as Error;
      alert(error?.message || "Failed to set up 2FA");
    }
  }

  async function verifyAndEnable2FA() {
    if (!verificationCode) {
      alert("Please enter the verification code");
      return;
    }

    try {
      const response = await apiClient.post("/api/employer/2fa/verify", { 
        code: verificationCode 
      });

      if (response.success) {
        setTwoFactorEnabled(true);
        setShowQRCode(false);
        setVerificationCode("");
        alert("Two-factor authentication enabled successfully!");
      } else {
        alert(response.error?.message || "Invalid verification code");
      }
    } catch (e: unknown) {
      const error = e as Error;
      alert(error?.message || "Failed to verify 2FA");
    }
  }

  async function disable2FA() {
    if (!confirm("Are you sure you want to disable two-factor authentication? This will make your account less secure.")) {
      return;
    }

    try {
      const response = await apiClient.post("/api/employer/2fa/disable", {});

      if (response.success) {
        setTwoFactorEnabled(false);
        setQrCodeUrl(null);
        setBackupCodes([]);
        alert("Two-factor authentication disabled");
      } else {
        alert(response.error?.message || "Failed to disable two-factor authentication");
      }
    } catch (e: unknown) {
      const error = e as Error;
      alert(error?.message || "Failed to disable 2FA");
    }
  }

  async function handleLogout() {
    if (confirm("Are you sure you want to log out?")) {
      window.location.href = "/employer/login";
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "profile", label: "Profile" },
    { id: "security", label: "Security" },
    { id: "preferences", label: "Preferences" },
    { id: "integrations", label: "Integrations" },
    { id: "privacy", label: "Privacy & Data" },
  ];

  if (loading) {
    return (
      <main style={{
        minHeight: "100vh",
        background: "var(--surface-0)",
        position: "relative" as const,
        overflow: "auto",
      }}>
        <div style={{
          position: "relative" as const,
          zIndex: 1,
          maxWidth: 1200,
          margin: "0 auto",
          padding: "var(--space-8) var(--space-6)",
        }}>
          <LoadingState />
        </div>
      </main>
    );
  }

  if (err) {
    return (
      <main style={{
        minHeight: "100vh",
        background: "var(--surface-0)",
        position: "relative" as const,
        overflow: "auto",
      }}>
        <div style={{
          position: "relative" as const,
          zIndex: 1,
          maxWidth: 1200,
          margin: "0 auto",
          padding: "var(--space-8) var(--space-6)",
        }}>
          <ErrorState 
            title="Failed to load profile" 
            message={err} 
            onRetry={() => window.location.reload()} 
          />
        </div>
      </main>
    );
  }

  return (
    <main style={{
      minHeight: "100vh",
      background: "var(--surface-0)",
      position: "relative" as const,
      overflow: "auto",
    }}>

      <div style={{
        position: "relative" as const,
        zIndex: 1,
        maxWidth: 1200,
        margin: "0 auto",
        padding: "var(--space-8) var(--space-6)",
      }}>
        {/* Header */}
        <div style={{
          marginBottom: "var(--space-8)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap" as const,
          gap: "var(--space-4)",
        }}>
          <div>
            <h1 style={{
              fontSize: "var(--text-2xl)",
              fontWeight: 600,
              color: "var(--text-primary)",
              margin: "0 0 var(--space-2) 0",
              letterSpacing: "-0.02em",
            }}>
              Account Settings
            </h1>
            <p style={{
              color: "var(--text-secondary)",
              fontSize: "var(--text-base)",
              margin: 0,
            }}>
              Manage your profile, security, and preferences
            </p>
          </div>
          <div style={{ display: "flex", gap: "var(--space-3)" }}>
            <Link
              href="/employer/dashboard"
              style={{
                padding: "var(--space-3) var(--space-4)",
                borderRadius: 8,
                border: "1px solid var(--border-default)",
                background: "var(--surface-2)",
                color: "var(--text-primary)",
                textDecoration: "none",
                fontSize: "var(--text-sm)",
                fontWeight: 500,
                transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              ← Dashboard
            </Link>
            <button
              onClick={handleLogout}
              style={{
                padding: "var(--space-3) var(--space-4)",
                borderRadius: 8,
                border: "1px solid var(--color-error)",
                background: "rgba(196, 137, 137, 0.15)",
                color: "var(--color-error)",
                fontSize: "var(--text-sm)",
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              Log out
            </button>
          </div>
        </div>

        {/* Show error state if there's an error */}
        {err && (
          <ErrorState
            title="Failed to load profile"
            message={err}
            onRetry={retryFetch}
          />
        )}

        {/* Show loading state while loading */}
        {loading && !err && (
          <LoadingState 
            message="Loading your profile..." 
            size="large" 
          />
        )}

        {/* Show content when not loading and no error */}
        {!loading && !err && (
          <>
            {/* Tabs */}
            <div style={{
              background: "var(--surface-1)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 8,
              padding: "var(--space-1)",
              marginBottom: "var(--space-6)",
              display: "flex",
              gap: "var(--space-1)",
              flexWrap: "wrap" as const,
            }}>
              {tabs.map((tab) => (
                <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "var(--space-3) var(--space-5)",
                borderRadius: 6,
                border: "none",
                background: activeTab === tab.id
                  ? "var(--surface-3)"
                  : "transparent",
                color: activeTab === tab.id ? "var(--text-primary)" : "var(--text-secondary)",
                fontSize: "var(--text-sm)",
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
                borderBottom: activeTab === tab.id ? "1px solid var(--accent-blue)" : "1px solid transparent",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Save Message */}
        {saveMessage && (
          <div style={{
            marginBottom: "var(--space-6)",
            padding: "var(--space-3) var(--space-4)",
            borderRadius: 8,
            background: "rgba(133, 182, 156, 0.15)",
            border: "1px solid var(--color-success)",
            color: "var(--color-success)",
            fontSize: "var(--text-sm)",
          }}>
            {saveMessage}
          </div>
        )}

        {/* Error Message */}
        {err && (
          <div style={{
            marginBottom: "var(--space-6)",
            padding: "var(--space-3) var(--space-4)",
            borderRadius: 8,
            background: "rgba(196, 137, 137, 0.15)",
            border: "1px solid var(--color-error)",
            color: "var(--color-error)",
            fontSize: "var(--text-sm)",
          }}>
            {err}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border-subtle)",
            borderRadius: 8,
            padding: "var(--space-8)",
          }}>
            <h2 style={{ fontSize: "var(--text-xl)", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 var(--space-6) 0" }}>
              Profile Information
            </h2>

            {/* Avatar */}
            <div style={{ marginBottom: "var(--space-8)", paddingBottom: "var(--space-8)", borderBottom: "1px solid var(--border-subtle)" }}>
              <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "var(--space-3)" }}>
                Profile Photo
              </label>
              <div style={{ display: "flex", gap: "var(--space-4)", alignItems: "center" }}>
                {avatar ? (
                  <img src={avatar} alt="Avatar" style={{ width: 80, height: 80, borderRadius: 8, objectFit: "cover" as const, border: "1px solid var(--border-default)" }} />
                ) : (
                  <div style={{ width: 80, height: 80, borderRadius: 8, background: "var(--surface-3)", border: "1px solid var(--border-default)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "var(--text-xl)", color: "var(--text-tertiary)" }}>—</div>
                )}
                <div>
                  <input type="file" accept="image/*" onChange={(e) => onPickPhoto(e.target.files?.[0] || null)} style={{ display: "none" }} id="avatar-upload" />
                  <label htmlFor="avatar-upload" style={{ display: "inline-block", padding: "var(--space-3) var(--space-4)", borderRadius: 8, background: "var(--accent-blue-glow)", border: "1px solid var(--accent-blue-dim)", color: "var(--accent-blue)", fontSize: "var(--text-sm)", fontWeight: 500, cursor: "pointer", marginRight: "var(--space-2)" }}>
                    Upload Photo
                  </label>
                  {avatar && <button onClick={clearPhoto} style={{ padding: "var(--space-3) var(--space-4)", borderRadius: 8, background: "rgba(196, 137, 137, 0.15)", border: "1px solid var(--color-error)", color: "var(--color-error)", fontSize: "var(--text-sm)", fontWeight: 500, cursor: "pointer" }}>Remove</button>}
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--space-5)" }}>
              <div>
                <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "var(--space-2)" }}>First Name</label>
                <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="John" style={{ width: "100%", padding: "var(--space-3) var(--space-4)", borderRadius: 8, background: "var(--surface-1)", border: "1px solid var(--border-default)", color: "var(--text-primary)", fontSize: "var(--text-base)" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "var(--space-2)" }}>Last Name</label>
                <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" style={{ width: "100%", padding: "var(--space-3) var(--space-4)", borderRadius: 8, background: "var(--surface-1)", border: "1px solid var(--border-default)", color: "var(--text-primary)", fontSize: "var(--text-base)" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "var(--space-2)" }}>Email</label>
                <input type="email" value={email} disabled style={{ width: "100%", padding: "var(--space-3) var(--space-4)", borderRadius: 8, background: "var(--surface-1)", border: "1px solid var(--border-subtle)", color: "var(--text-tertiary)", fontSize: "var(--text-base)", cursor: "not-allowed" }} />
                <div style={{ marginTop: "var(--space-2)", fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>Contact support to change your email</div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "var(--space-2)" }}>Company Name</label>
                <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Corporation" style={{ width: "100%", padding: "var(--space-3) var(--space-4)", borderRadius: 8, background: "var(--surface-1)", border: "1px solid var(--border-default)", color: "var(--text-primary)", fontSize: "var(--text-base)" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "var(--space-2)" }}>Timezone</label>
                <select value={timezone} onChange={(e) => setTimezone(e.target.value)} style={{ width: "100%", padding: "var(--space-3) var(--space-4)", borderRadius: 8, background: "var(--surface-1)", border: "1px solid var(--border-default)", color: "var(--text-primary)", fontSize: "var(--text-base)" }}>
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option>
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="Europe/London">London (GMT)</option>
                  <option value="Europe/Paris">Paris (CET)</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "var(--space-2)" }}>Language</label>
                <select value={language} onChange={(e) => setLanguage(e.target.value)} style={{ width: "100%", padding: "var(--space-3) var(--space-4)", borderRadius: 8, background: "var(--surface-1)", border: "1px solid var(--border-default)", color: "var(--text-primary)", fontSize: "var(--text-base)" }}>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: "var(--space-8)" }}>
              <button onClick={saveProfile} style={{ padding: "var(--space-3) var(--space-6)", borderRadius: 8, background: "var(--accent-blue-glow)", border: "1px solid var(--accent-blue-dim)", color: "var(--accent-blue)", fontSize: "var(--text-base)", fontWeight: 500, cursor: "pointer", transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)" }}>
                Save Changes
              </button>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === "security" && (
          <div style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)", borderRadius: 8, padding: "var(--space-8)" }}>
            <h2 style={{ fontSize: "var(--text-xl)", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 var(--space-6) 0" }}>Security</h2>

            {/* Change Password */}
            <div style={{ marginBottom: "var(--space-8)", paddingBottom: "var(--space-8)", borderBottom: "1px solid var(--border-subtle)" }}>
              <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 500, color: "var(--text-primary)", margin: "0 0 var(--space-4) 0" }}>Change Password</h3>
              <div style={{ display: "grid", gap: "var(--space-4)", maxWidth: 400 }}>
                <div>
                  <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "var(--space-2)" }}>Current Password</label>
                  <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} style={{ width: "100%", padding: "var(--space-3) var(--space-4)", borderRadius: 8, background: "var(--surface-1)", border: "1px solid var(--border-default)", color: "var(--text-primary)", fontSize: "var(--text-base)" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "var(--space-2)" }}>New Password</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={{ width: "100%", padding: "var(--space-3) var(--space-4)", borderRadius: 8, background: "var(--surface-1)", border: "1px solid var(--border-default)", color: "var(--text-primary)", fontSize: "var(--text-base)" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "var(--space-2)" }}>Confirm Password</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={{ width: "100%", padding: "var(--space-3) var(--space-4)", borderRadius: 8, background: "var(--surface-1)", border: "1px solid var(--border-default)", color: "var(--text-primary)", fontSize: "var(--text-base)" }} />
                </div>
                <button onClick={changePassword} style={{ padding: "var(--space-3) var(--space-6)", borderRadius: 8, background: "var(--accent-blue-glow)", border: "1px solid var(--accent-blue-dim)", color: "var(--accent-blue)", fontSize: "var(--text-base)", fontWeight: 500, cursor: "pointer" }}>Update Password</button>
              </div>
            </div>

            {/* Two-Factor Authentication */}
            <div style={{ marginBottom: "var(--space-8)", paddingBottom: "var(--space-8)", borderBottom: "1px solid var(--border-subtle)" }}>
              <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 500, color: "var(--text-primary)", margin: "0 0 var(--space-4) 0" }}>Two-Factor Authentication</h3>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
                <span style={{ color: "var(--text-secondary)" }}>Status:</span>
                {twoFactorEnabled ? (
                  <span style={{ padding: "var(--space-1) var(--space-3)", borderRadius: 6, background: "rgba(133, 182, 156, 0.15)", border: "1px solid var(--color-success)", color: "var(--color-success)", fontSize: "var(--text-xs)", fontWeight: 500 }}>Enabled</span>
                ) : (
                  <span style={{ padding: "var(--space-1) var(--space-3)", borderRadius: 6, background: "rgba(196, 176, 137, 0.15)", border: "1px solid var(--color-warning)", color: "var(--color-warning)", fontSize: "var(--text-xs)", fontWeight: 500 }}>Disabled</span>
                )}
              </div>
              
              <p style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)", marginBottom: "var(--space-4)" }}>
                Add an extra layer of security to your account by enabling two-factor authentication using an authenticator app.
              </p>

              {!twoFactorEnabled && !showQRCode && (
                <button 
                  onClick={setupTwoFactor} 
                  style={{ padding: "var(--space-3) var(--space-4)", borderRadius: 8, background: "var(--accent-blue-glow)", border: "1px solid var(--accent-blue-dim)", color: "var(--accent-blue)", fontSize: "var(--text-sm)", fontWeight: 500, cursor: "pointer" }}
                >
                  Enable Two-Factor Authentication
                </button>
              )}

              {showQRCode && !twoFactorEnabled && (
                <div style={{ maxWidth: 400 }}>
                  <h4 style={{ fontSize: "var(--text-base)", fontWeight: 500, color: "var(--text-primary)", margin: "0 0 var(--space-3) 0" }}>Set up your authenticator app</h4>
                  <div style={{ marginBottom: "var(--space-4)" }}>
                    <p style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)", marginBottom: "var(--space-3)" }}>
                      1. Download an authenticator app like Google Authenticator, Authy, or Microsoft Authenticator
                    </p>
                    <p style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)", marginBottom: "var(--space-3)" }}>
                      2. Scan this QR code with your authenticator app:
                    </p>
                    {qrCodeUrl && (
                      <div style={{ padding: "var(--space-4)", background: "white", borderRadius: 8, display: "inline-block", marginBottom: "var(--space-3)" }}>
                        <img src={qrCodeUrl} alt="QR Code for 2FA setup" style={{ width: 200, height: 200 }} />
                      </div>
                    )}
                    <p style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)", marginBottom: "var(--space-3)" }}>
                      3. Enter the 6-digit code from your authenticator app:
                    </p>
                    <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
                      <input 
                        type="text" 
                        value={verificationCode} 
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        maxLength={6}
                        style={{ width: 120, padding: "var(--space-3) var(--space-4)", borderRadius: 8, background: "var(--surface-1)", border: "1px solid var(--border-default)", color: "var(--text-primary)", fontSize: "var(--text-base)", textAlign: "center" }} 
                      />
                      <button 
                        onClick={verifyAndEnable2FA} 
                        disabled={verificationCode.length !== 6}
                        style={{ padding: "var(--space-3) var(--space-4)", borderRadius: 8, background: verificationCode.length === 6 ? "var(--accent-blue-glow)" : "var(--surface-3)", border: "1px solid var(--border-default)", color: verificationCode.length === 6 ? "var(--accent-blue)" : "var(--text-secondary)", fontSize: "var(--text-sm)", fontWeight: 500, cursor: verificationCode.length === 6 ? "pointer" : "not-allowed" }}
                      >
                        Verify & Enable
                      </button>
                    </div>
                  </div>

                  {backupCodes.length > 0 && (
                    <div style={{ background: "var(--surface-1)", border: "1px solid var(--border-default)", borderRadius: 8, padding: "var(--space-4)", marginTop: "var(--space-4)" }}>
                      <h5 style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 var(--space-2) 0" }}>Backup Codes</h5>
                      <p style={{ color: "var(--text-secondary)", fontSize: "var(--text-xs)", marginBottom: "var(--space-3)" }}>Save these codes in a secure location. You can use them to access your account if you lose your phone.</p>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "var(--space-2)", fontFamily: "monospace", fontSize: "var(--text-sm)" }}>
                        {backupCodes.map((code, index) => (
                          <div key={index} style={{ padding: "var(--space-2)", background: "var(--surface-2)", borderRadius: 4, color: "var(--text-primary)" }}>
                            {code}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {twoFactorEnabled && (
                <div>
                  <p style={{ color: "var(--color-success)", fontSize: "var(--text-sm)", marginBottom: "var(--space-3)" }}>
                    ✅ Two-factor authentication is active and protecting your account.
                  </p>
                  <button 
                    onClick={disable2FA} 
                    style={{ padding: "var(--space-3) var(--space-4)", borderRadius: 8, background: "rgba(196, 176, 137, 0.15)", border: "1px solid var(--color-warning)", color: "var(--color-warning)", fontSize: "var(--text-sm)", fontWeight: 500, cursor: "pointer" }}
                  >
                    Disable Two-Factor Authentication
                  </button>
                </div>
              )}
            </div>

            {/* Email Verification */}
            <div style={{ marginBottom: "var(--space-8)", paddingBottom: "var(--space-8)", borderBottom: "1px solid var(--border-subtle)" }}>
              <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 500, color: "var(--text-primary)", margin: "0 0 var(--space-4) 0" }}>Email Verification</h3>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-3)" }}>
                <span style={{ color: "var(--text-secondary)" }}>Email: {email}</span>
                {emailVerified ? (
                  <span style={{ padding: "var(--space-1) var(--space-3)", borderRadius: 6, background: "rgba(133, 182, 156, 0.15)", border: "1px solid var(--color-success)", color: "var(--color-success)", fontSize: "var(--text-xs)", fontWeight: 500 }}>Verified</span>
                ) : (
                  <span style={{ padding: "var(--space-1) var(--space-3)", borderRadius: 6, background: "rgba(196, 176, 137, 0.15)", border: "1px solid var(--color-warning)", color: "var(--color-warning)", fontSize: "var(--text-xs)", fontWeight: 500 }}>Not Verified</span>
                )}
              </div>
              {!emailVerified && (
                <button onClick={resendVerification} style={{ padding: "var(--space-3) var(--space-4)", borderRadius: 8, background: "var(--accent-blue-glow)", border: "1px solid var(--accent-blue-dim)", color: "var(--accent-blue)", fontSize: "var(--text-sm)", fontWeight: 500, cursor: "pointer" }}>Resend Verification Email</button>
              )}
            </div>

            {/* Session Info */}
            <div>
              <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 500, color: "var(--text-primary)", margin: "0 0 var(--space-4) 0" }}>Session Information</h3>
              <div style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>
                Last login: {lastLogin || "Unknown"}
              </div>
            </div>
          </div>
        )}

        {/* Preferences Tab */}
        {activeTab === "preferences" && (
          <div style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)", borderRadius: 8, padding: "var(--space-8)" }}>
            <h2 style={{ fontSize: "var(--text-xl)", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 var(--space-6) 0" }}>Preferences</h2>

            <div style={{ display: "grid", gap: "var(--space-5)" }}>
              {/* Notification Preferences */}
              <div>
                <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 500, color: "var(--text-primary)", margin: "0 0 var(--space-4) 0" }}>Notifications</h3>
                <div style={{ display: "grid", gap: "var(--space-3)" }}>
                  <ToggleRow label="Email Notifications" description="Receive email updates about new applicants and activity" checked={emailNotifications} onChange={setEmailNotifications} />
                  <ToggleRow label="Weekly Insights" description="Get a weekly summary of hiring metrics and trends" checked={weeklyInsights} onChange={setWeeklyInsights} />
                  <ToggleRow label="Instant Alerts" description="Immediate notification when a candidate completes an assessment" checked={instantAlerts} onChange={setInstantAlerts} />
                </div>
              </div>

              {/* UI Preferences */}
              <div style={{ marginTop: "var(--space-8)", paddingTop: "var(--space-8)", borderTop: "1px solid var(--border-subtle)" }}>
                <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 500, color: "var(--text-primary)", margin: "0 0 var(--space-4) 0" }}>Interface</h3>
                <div style={{ display: "grid", gap: "var(--space-3)" }}>
                  <ToggleRow label="Dark Mode" description="Use dark theme throughout the application" checked={darkMode} onChange={setDarkMode} />
                </div>
              </div>

              <div style={{ marginTop: "var(--space-8)" }}>
                <button onClick={saveProfile} style={{ padding: "var(--space-3) var(--space-6)", borderRadius: 8, background: "var(--accent-blue-glow)", border: "1px solid var(--accent-blue-dim)", color: "var(--accent-blue)", fontSize: "var(--text-base)", fontWeight: 500, cursor: "pointer" }}>Save Preferences</button>
              </div>
            </div>
          </div>
        )}

        {/* Integrations Tab */}
        {activeTab === "integrations" && (
          <div style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)", borderRadius: 8, padding: "var(--space-8)" }}>
            <h2 style={{ fontSize: "var(--text-xl)", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 var(--space-6) 0" }}>Integrations</h2>

            <div style={{ display: "grid", gap: "var(--space-4)" }}>
              <IntegrationCard name="Google Calendar" status="Not connected" description="Sync interview schedules and availability" />
              <IntegrationCard name="Slack" status="Not connected" description="Get notifications in your workspace" />
              <IntegrationCard name="LinkedIn" status="Not connected" description="Import candidate profiles" />
              <IntegrationCard name="Greenhouse ATS" status="Not connected" description="Sync with your applicant tracking system" />
            </div>
          </div>
        )}

        {/* Privacy Tab */}
        {activeTab === "privacy" && (
          <div style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)", borderRadius: 8, padding: "var(--space-8)" }}>
            <h2 style={{ fontSize: "var(--text-xl)", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 var(--space-6) 0" }}>Privacy & Data</h2>

            <div style={{ display: "grid", gap: "var(--space-8)" }}>
              {/* Data Export */}
              <div>
                <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 500, color: "var(--text-primary)", margin: "0 0 var(--space-3) 0" }}>Data Export</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)", margin: "0 0 var(--space-4) 0" }}>
                  Download a copy of all your data including roles, assessments, and candidate information.
                </p>
                <button style={{ padding: "var(--space-3) var(--space-4)", borderRadius: 8, background: "var(--accent-blue-glow)", border: "1px solid var(--accent-blue-dim)", color: "var(--accent-blue)", fontSize: "var(--text-sm)", fontWeight: 500, cursor: "pointer" }}>Request Data Export</button>
              </div>

              {/* Account Deletion */}
              <div style={{ paddingTop: "var(--space-8)", borderTop: "1px solid var(--border-subtle)" }}>
                <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 500, color: "var(--color-error)", margin: "0 0 var(--space-3) 0" }}>Danger Zone</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)", margin: "0 0 var(--space-4) 0" }}>
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                <button onClick={() => confirm("Are you sure you want to delete your account? This cannot be undone.") && alert("Account deletion would be processed")} style={{ padding: "var(--space-3) var(--space-4)", borderRadius: 8, background: "rgba(196, 137, 137, 0.15)", border: "1px solid var(--color-error)", color: "var(--color-error)", fontSize: "var(--text-sm)", fontWeight: 500, cursor: "pointer" }}>Delete Account</button>
              </div>

              {/* Compliance */}
              <div style={{ paddingTop: "var(--space-8)", borderTop: "1px solid var(--border-subtle)" }}>
                <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 500, color: "var(--text-primary)", margin: "0 0 var(--space-3) 0" }}>Compliance</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)", margin: 0 }}>
                  We are committed to protecting your privacy and complying with GDPR, CCPA, and other data protection regulations. 
                  For more information, review our <Link href="/privacy" style={{ color: "var(--accent-blue)", textDecoration: "underline" }}>Privacy Policy</Link> and <Link href="/terms" style={{ color: "var(--accent-blue)", textDecoration: "underline" }}>Terms of Service</Link>.
                </p>
              </div>
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </main>
  );
}

// Toggle Row Component
function ToggleRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (val: boolean) => void }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-4)", background: "var(--surface-1)", border: "1px solid var(--border-subtle)", borderRadius: 8 }}>
      <div>
        <div style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-primary)", marginBottom: "var(--space-1)" }}>{label}</div>
        <div style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>{description}</div>
      </div>
      <button onClick={() => onChange(!checked)} style={{ width: 48, height: 26, borderRadius: 20, border: "1px solid var(--border-default)", background: checked ? "var(--accent-blue-glow)" : "var(--surface-2)", position: "relative" as const, cursor: "pointer", transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)" }}>
        <div style={{ position: "absolute" as const, top: 2, left: checked ? 24 : 2, width: 20, height: 20, borderRadius: "50%", background: checked ? "var(--accent-blue)" : "var(--text-tertiary)", transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)" }} />
      </button>
    </div>
  );
}

// Integration Card Component
function IntegrationCard({ name, status, description }: { name: string; status: string; description: string }) {
  const connected = status === "Connected";
  return (
    <div style={{ padding: "var(--space-5)", background: "var(--surface-1)", border: "1px solid var(--border-subtle)", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ display: "flex", gap: "var(--space-4)", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: "var(--text-base)", fontWeight: 500, color: "var(--text-primary)", marginBottom: "var(--space-1)" }}>{name}</div>
          <div style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginBottom: "var(--space-2)" }}>{description}</div>
          <span style={{ padding: "var(--space-1) var(--space-3)", borderRadius: 6, background: connected ? "rgba(133, 182, 156, 0.15)" : "var(--surface-2)", border: connected ? "1px solid var(--color-success)" : "1px solid var(--border-default)", color: connected ? "var(--color-success)" : "var(--text-secondary)", fontSize: "var(--text-xs)", fontWeight: 500 }}>
            {status}
          </span>
        </div>
      </div>
      <button style={{ padding: "var(--space-3) var(--space-4)", borderRadius: 8, background: connected ? "var(--accent-blue-glow)" : "var(--accent-blue-glow)", border: connected ? "1px solid var(--accent-blue-dim)" : "1px solid var(--accent-blue-dim)", color: "var(--accent-blue)", fontSize: "var(--text-sm)", fontWeight: 500, cursor: "pointer" }}>
        {connected ? "Configure" : "Connect"}
      </button>
    </div>
  );
}
