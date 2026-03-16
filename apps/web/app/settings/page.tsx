import { getIntegrationSettings } from "@/lib/data";
import { SectionHeader, StatusPill } from "@/components/section";

export default async function SettingsPage() {
  const settings = await getIntegrationSettings();

  return (
    <div className="stack">
      <section className="hero">
        <p className="muted">Settings / Integrations</p>
        <h2>GitHub and Compass API configuration for the self-hosted evaluator.</h2>
      </section>

      <section className="grid-2">
        <div className="panel card">
          <SectionHeader title="GitHub" subtitle="Webhook ingestion and repo sync configuration state." />
          <ul className="detail-list">
            <li>
              Webhook secret: <StatusPill status={settings.githubWebhookSecretConfigured ? "passed" : "failed"} />
            </li>
            <li>
              GitHub App: <StatusPill status={settings.githubAppConfigured ? "passed" : "skipped"} />
            </li>
          </ul>
        </div>
        <div className="panel card">
          <SectionHeader title="Compass API" subtitle="Promptfoo provider configuration for online evaluations." />
          <ul className="detail-list">
            <li>Base URL: {settings.compassBaseUrl}</li>
            <li>Model: {settings.compassModel}</li>
            <li>Artifacts root: {settings.artifactsRoot}</li>
          </ul>
        </div>
      </section>
    </div>
  );
}

