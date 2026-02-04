import "./globals.css";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "EPQ Assessment Platform",
  description: "Employee Personality Assessment for Better Workplace Fit",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#ffffff" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body style={{ fontFamily: "system-ui, sans-serif" }}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}


