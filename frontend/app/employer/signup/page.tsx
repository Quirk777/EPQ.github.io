"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ParticleBackground from "../../components/ParticleBackground";

type PasswordRule = {
  label: string;
  test: (pwd: string) => boolean;
};

const passwordRules: PasswordRule[] = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "Contains a letter", test: (p) => /[a-zA-Z]/.test(p) },
  { label: "Contains a number", test: (p) => /[0-9]/.test(p) },
];

export default function EmployerSignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const passwordValid = passwordRules.every((r) => r.test(password));
  const canSubmit = email.trim() && password.trim() && passwordValid && !busy;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/employer/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim(),
          password,
          company_name: companyName.trim() || undefined,
          first_name: firstName.trim() || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const detail = data?.detail || "Sign up failed";
        throw new Error(detail);
      }

      // Show success message
      setShowSuccess(true);
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.replace("/employer/login?registered=true");
      }, 2000);
    } catch (e: unknown) {
      const err = e as Error;
      setError(err?.message || "Sign up failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (showSuccess) {
    return (
      <main style={{
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
          textAlign: "center",
        }}>
          <div style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: "var(--color-success)",
            margin: "0 auto 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 40,
            color: "var(--surface-0)",
            fontWeight: 900,
            boxShadow: "0 8px 32px rgba(133, 182, 156, 0.4)",
          }}>
            ✓
          </div>
          <h1 style={{
            fontSize: 28,
            fontWeight: 900,
            color: "var(--text-primary)",
            marginBottom: 12,
          }}>
            Account created successfully
          </h1>
          <p style={{
            color: "var(--text-secondary)",
            fontSize: 16,
            lineHeight: 1.6,
          }}>
            Redirecting you to login...
          </p>
        </div>
      </main>
    );
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
        width: "min(480px, 100%)",
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
              Create your account
            </h1>
            <p style={{
              color: "var(--text-secondary)",
              fontSize: 15,
              lineHeight: 1.6,
              margin: 0,
            }}>
              You'll be handling sensitive candidate information.<br />
              We verify accounts to keep that data protected.
            </p>
          </div>

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
              Work email
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
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

          {/* Company Name (Optional) */}
          <label style={{ display: "block", marginBottom: 20 }}>
            <div style={{
              fontSize: 13,
              fontWeight: 600,
              color: "rgba(255, 255, 255, 0.8)",
              marginBottom: 8,
            }}>
              Company name <span style={{ color: "rgba(255, 255, 255, 0.4)", fontWeight: 400 }}>(optional)</span>
            </div>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Acme Inc."
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: 12,
                border: "1px solid rgba(255, 255, 255, 0.1)",
                background: "rgba(255, 255, 255, 0.05)",
                color: "#ffffff",
                fontSize: 15,
                outline: "none",
                transition: "all 0.2s ease",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.5)";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
              }}
            />
          </label>

          {/* First Name (Optional) */}
          <label style={{ display: "block", marginBottom: 20 }}>
            <div style={{
              fontSize: 13,
              fontWeight: 600,
              color: "rgba(255, 255, 255, 0.8)",
              marginBottom: 8,
            }}>
              First name <span style={{ color: "rgba(255, 255, 255, 0.4)", fontWeight: 400 }}>(optional)</span>
            </div>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="John"
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: 12,
                border: "1px solid rgba(255, 255, 255, 0.1)",
                background: "rgba(255, 255, 255, 0.05)",
                color: "#ffffff",
                fontSize: 15,
                outline: "none",
                transition: "all 0.2s ease",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.5)";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
              }}
            />
          </label>

          {/* Password Field */}
          <label style={{ display: "block", marginBottom: 12 }}>
            <div style={{
              fontSize: 13,
              fontWeight: 600,
              color: "rgba(255, 255, 255, 0.8)",
              marginBottom: 8,
            }}>
              Password
            </div>
            <div style={{ position: "relative" as const }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a secure password"
                required
                style={{
                  width: "100%",
                  padding: "12px 50px 12px 16px",
                  borderRadius: 12,
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  background: "rgba(255, 255, 255, 0.05)",
                  color: "#ffffff",
                  fontSize: 15,
                  outline: "none",
                  transition: "all 0.2s ease",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.5)";
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
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
                  color: "rgba(255, 255, 255, 0.5)",
                  cursor: "pointer",
                  fontSize: 20,
                  padding: 4,
                }}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </label>

          {/* Password Rules */}
          {password && (
            <div style={{
              marginBottom: 24,
              padding: "12px 16px",
              borderRadius: 12,
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}>
              <div style={{
                fontSize: 12,
                fontWeight: 600,
                color: "rgba(255, 255, 255, 0.6)",
                marginBottom: 8,
              }}>
                Password requirements:
              </div>
              {passwordRules.map((rule, i) => {
                const passes = rule.test(password);
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 13,
                      color: passes ? "#10b981" : "rgba(255, 255, 255, 0.5)",
                      marginTop: 6,
                    }}
                  >
                    <span>{passes ? "✔️" : "○"}</span>
                    <span>{rule.label}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              width: "100%",
              padding: "14px 20px",
              borderRadius: 12,
              border: "none",
              background: canSubmit
                ? "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
                : "rgba(255, 255, 255, 0.1)",
              color: canSubmit ? "#ffffff" : "rgba(255, 255, 255, 0.4)",
              fontSize: 15,
              fontWeight: 700,
              cursor: canSubmit ? "pointer" : "not-allowed",
              transition: "all 0.3s ease",
              boxShadow: canSubmit ? "0 4px 20px rgba(99, 102, 241, 0.4)" : "none",
            }}
            onMouseEnter={(e) => {
              if (canSubmit) {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 25px rgba(99, 102, 241, 0.5)";
              }
            }}
            onMouseLeave={(e) => {
              if (canSubmit) {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 20px rgba(99, 102, 241, 0.4)";
              }
            }}
          >
            {busy ? "Creating account..." : "Create account"}
          </button>

          {/* Footer */}
          <div style={{
            marginTop: 24,
            textAlign: "center",
            fontSize: 14,
            color: "rgba(255, 255, 255, 0.6)",
          }}>
            Already have an account?{" "}
            <Link
              href="/employer/login"
              style={{
                color: "#8b5cf6",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Sign in
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