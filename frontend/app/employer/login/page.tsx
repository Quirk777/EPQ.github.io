"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import ParticleBackground from "../../components/ParticleBackground";

function EmployerLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check for registration success
  useEffect(() => {
    if (searchParams?.get("registered") === "true") {
      setSuccessMessage("Account created successfully! Please sign in.");
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  }, [searchParams]);

  // Load remembered email
  useEffect(() => {
    const remembered = localStorage.getItem("rememberedEmail");
    if (remembered) {
      setEmail(remembered);
      setRememberMe(true);
    }
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/employer/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // Improved error message
        const detail = data?.detail || "";
        if (detail.toLowerCase().includes("email")) {
          throw new Error("That email address doesn't match our records");
        } else if (detail.toLowerCase().includes("password")) {
          throw new Error("That password doesn't match our records");
        } else {
          throw new Error("That email or password doesn't match our records");
        }
      }

      // Store email if remember me is checked
      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email);
      } else {
        localStorage.removeItem("rememberedEmail");
      }

      // Route to dashboard
      router.replace("/employer/dashboard");
    } catch (e: unknown) {
      const err = e as Error;
      setError(err?.message || "Login failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="surface-texture-fine" style={{
      minHeight: "100vh",
      background: "var(--surface-0)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      position: "relative" as const,
      overflow: "hidden",
    }}>
      <ParticleBackground />
      <div style={{
        position: "relative" as const,
        zIndex: 1,
        width: "min(440px, 100%)",
      }}>
        <form onSubmit={submit} className="surface-texture-subtle" style={{
          background: "var(--surface-1)",
          backdropFilter: "blur(20px)",
          border: "1px solid var(--border-default)",
          borderRadius: 24,
          padding: "40px",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
        }}>
          {/* Header */}
          <div style={{ marginBottom: 32, textAlign: "center" }}>
            <h1 style={{
              fontSize: 32,
              fontWeight: 900,
              color: "var(--text-primary)",
              margin: "0 0 12px 0",
              letterSpacing: "-0.5px",
            }}>
              Welcome back
            </h1>
            <p style={{
              color: "var(--text-secondary)",
              fontSize: 15,
              lineHeight: 1.6,
              margin: 0,
            }}>
              Sign in to manage your hiring process
            </p>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div style={{
              marginBottom: 24,
              padding: "14px 16px",
              borderRadius: 12,
              background: "rgba(133, 182, 156, 0.15)",
              border: "1px solid rgba(133, 182, 156, 0.3)",
              color: "var(--color-success)",
              fontSize: 14,
              lineHeight: 1.5,
            }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Success</div>
              {successMessage}
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div style={{
              marginBottom: 24,
              padding: "14px 16px",
              borderRadius: 12,
              background: "rgba(196, 137, 137, 0.15)",
              border: "1px solid rgba(196, 137, 137, 0.3)",
              color: "var(--color-error)",
              fontSize: 14,
              lineHeight: 1.5,
            }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Error</div>
              {error}
            </div>
          )}

          {/* Email Field */}
          <label style={{ display: "block", marginBottom: 20 }}>
            <div style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: 8,
            }}>
              Email
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              autoComplete="email"
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: 12,
                border: "1px solid var(--border-default)",
                background: "var(--surface-2)",
                color: "var(--text-primary)",
                fontSize: 15,
                outline: "none",
                transition: "all 0.2s ease",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--accent-blue)";
                e.currentTarget.style.background = "var(--surface-3)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--border-default)";
                e.currentTarget.style.background = "var(--surface-2)";
              }}
            />
          </label>

          {/* Password Field */}
          <label style={{ display: "block", marginBottom: 16 }}>
            <div style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: 8,
            }}>
              Password
            </div>
            <div style={{ position: "relative" as const }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                style={{
                  width: "100%",
                  padding: "12px 50px 12px 16px",
                  borderRadius: 12,
                  border: "1px solid var(--border-default)",
                  background: "var(--surface-2)",
                  color: "var(--text-primary)",
                  fontSize: 15,
                  outline: "none",
                  transition: "all 0.2s ease",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent-blue)";
                  e.currentTarget.style.background = "var(--surface-3)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-default)";
                  e.currentTarget.style.background = "var(--surface-2)";
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute" as const,
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  fontSize: 14,
                  padding: 4,
                  fontWeight: 600
                }}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          {/* Remember Me & Forgot Password */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}>
            <label style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              fontSize: 13,
              color: "var(--text-secondary)",
            }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ cursor: "pointer" }}
              />
              Remember me
            </label>
            <Link
              href="/employer/forgot-password"
              style={{
                fontSize: 13,
                color: "var(--accent-blue)",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Forgot password?
            </Link>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={busy}
            style={{
              width: "100%",
              padding: "14px 20px",
              borderRadius: 12,
              border: "none",
              background: busy
                ? "var(--surface-2)"
                : "var(--accent-blue)",
              color: busy ? "var(--text-secondary)" : "var(--surface-0)",
              fontSize: 15,
              fontWeight: 700,
              cursor: busy ? "not-allowed" : "pointer",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              if (!busy) {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.background = "var(--accent-blue-dim)";
              }
            }}
            onMouseLeave={(e) => {
              if (!busy) {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.background = "var(--accent-blue)";
              }
            }}
          >
            {busy ? "Signing in..." : "Sign in"}
          </button>

          {/* Footer */}
          <div style={{
            marginTop: 24,
            textAlign: "center",
            fontSize: 14,
            color: "var(--text-secondary)",
          }}>
            Don't have an account?{" "}
            <Link
              href="/employer/signup"
              style={{
                color: "var(--accent-blue)",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Sign up
            </Link>
          </div>

          {/* Security Signal */}
          <div style={{
            marginTop: 20,
            padding: "12px 16px",
            borderRadius: 12,
            background: "rgba(16, 185, 129, 0.05)",
            border: "1px solid rgba(16, 185, 129, 0.2)",
            textAlign: "center",
            fontSize: 12,
            color: "rgba(16, 185, 129, 0.9)",
          }}>
            🔒 Secure connection · Your data is encrypted
          </div>
        </form>
      </div>
    </main>
  );
}

export default function EmployerLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <EmployerLoginContent />
    </Suspense>
  );
}
