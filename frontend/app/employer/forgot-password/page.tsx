"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/employer/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.detail || "Failed to send reset email");
      }

      setSuccess(true);
    } catch (e: unknown) {
      const err = e as Error;
      setError(err?.message || "Failed to send reset email. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (success) {
    return (
      <main style={{
        minHeight: "100vh",
        background: "#0a0a0f",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        position: "relative" as const,
        overflow: "hidden",
      }}>
        
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
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            margin: "0 auto 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 40,
            boxShadow: "0 8px 32px rgba(99,102,241,0.4)",
          }}>
            ✉️
          </div>
          <h1 style={{
            fontSize: 28,
            fontWeight: 900,
            color: "#ffffff",
            marginBottom: 12,
          }}>
            Check your email
          </h1>
          <p style={{
            color: "rgba(255,255,255,0.7)",
            fontSize: 16,
            lineHeight: 1.6,
            marginBottom: 32,
          }}>
            We've sent password reset instructions to<br />
            <strong style={{ color: "#8b5cf6" }}>{email}</strong>
          </p>
          <p style={{
            color: "rgba(255,255,255,0.5)",
            fontSize: 14,
            marginBottom: 24,
          }}>
            The email might take a few minutes to arrive.<br />
            Check your spam folder if you don't see it.
          </p>
          <Link
            href="/employer/login"
            style={{
              display: "inline-block",
              padding: "12px 24px",
              borderRadius: 12,
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#ffffff",
              textDecoration: "none",
              fontWeight: 600,
              transition: "all 0.2s ease",
            }}
          >
            ← Back to login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main style={{
      minHeight: "100vh",
      background: "#0a0a0f",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      position: "relative" as const,
      overflow: "hidden",
    }}>

      {/* Gradient Orbs */}
      <div style={{
        position: "absolute" as const,
        top: "10%",
        left: "15%",
        width: 400,
        height: 400,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(99, 102, 241, 0) 70%)",
        filter: "blur(80px)",
        animation: "float 20s ease-in-out infinite",
      }}></div>
      <div style={{
        position: "absolute" as const,
        bottom: "15%",
        right: "10%",
        width: 350,
        height: 350,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(236, 72, 153, 0.15) 0%, rgba(236, 72, 153, 0) 70%)",
        filter: "blur(80px)",
        animation: "float 25s ease-in-out infinite reverse",
      }}></div>

      <div style={{
        position: "relative" as const,
        zIndex: 1,
        width: "min(440px, 100%)",
      }}>
        <form onSubmit={submit} style={{
          background: "rgba(255, 255, 255, 0.04)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: 24,
          padding: "40px",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
        }}>
          {/* Header */}
          <div style={{ marginBottom: 32, textAlign: "center" }}>
            <h1 style={{
              fontSize: 32,
              fontWeight: 900,
              color: "#ffffff",
              margin: "0 0 12px 0",
              letterSpacing: "-0.5px",
            }}>
              Reset password
            </h1>
            <p style={{
              color: "rgba(255, 255, 255, 0.6)",
              fontSize: 15,
              lineHeight: 1.6,
              margin: 0,
            }}>
              Enter your email and we'll send you<br />instructions to reset your password
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div style={{
              marginBottom: 24,
              padding: "14px 16px",
              borderRadius: 12,
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#fca5a5",
              fontSize: 14,
              lineHeight: 1.5,
            }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>⚠️ Error</div>
              {error}
            </div>
          )}

          {/* Email Field */}
          <label style={{ display: "block", marginBottom: 24 }}>
            <div style={{
              fontSize: 13,
              fontWeight: 600,
              color: "rgba(255, 255, 255, 0.8)",
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
                ? "rgba(255, 255, 255, 0.1)"
                : "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
              color: "#ffffff",
              fontSize: 15,
              fontWeight: 700,
              cursor: busy ? "not-allowed" : "pointer",
              transition: "all 0.3s ease",
              boxShadow: busy ? "none" : "0 4px 20px rgba(99, 102, 241, 0.4)",
            }}
            onMouseEnter={(e) => {
              if (!busy) {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 25px rgba(99, 102, 241, 0.5)";
              }
            }}
            onMouseLeave={(e) => {
              if (!busy) {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 20px rgba(99, 102, 241, 0.4)";
              }
            }}
          >
            {busy ? "Sending..." : "Send reset instructions"}
          </button>

          {/* Footer */}
          <div style={{
            marginTop: 24,
            textAlign: "center",
            fontSize: 14,
            color: "rgba(255, 255, 255, 0.6)",
          }}>
            <Link
              href="/employer/login"
              style={{
                color: "#8b5cf6",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              ← Back to login
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
