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
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/repositories/repo_demo">Repository</Link>
              <Link href="/pull-requests/pr_42">Pull Request</Link>
              <Link href="/runs/run_demo_1">Run Detail</Link>
              <Link href="/assertions">Failed Assertions</Link>
              <Link href="/settings">Settings</Link>
            </nav>
          </header>
          <main className="content">{children}</main>
        </div>
      </body>
    </html>
  );
}

