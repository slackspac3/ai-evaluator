import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Evaluator",
  description: "Self-hosted promptfoo-style PR evaluation portal"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <header className="topbar">
            <div className="brand">
              <div className="brand-mark">AE</div>
              <div className="brand-copy">
                <p>Prompt Review Platform</p>
                <h1>AI Evaluator</h1>
              </div>
            </div>
            <nav className="nav">
              <Link href="/">Start Assessment</Link>
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/repositories/repo_demo">AI System</Link>
              <Link href="/pull-requests/pr_42">Change Review</Link>
              <Link href="/runs/run_demo_1">Assessment Report</Link>
              <Link href="/assertions">Issues</Link>
              <Link href="/settings">Settings</Link>
            </nav>
          </header>
          <main className="content">{children}</main>
        </div>
      </body>
    </html>
  );
}
