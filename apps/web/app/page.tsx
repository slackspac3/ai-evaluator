const concernOptions = [
  { id: "security", title: "Security", description: "Check for prompt injection, hidden instructions, and unsafe data exposure." },
  { id: "fairness", title: "Fairness", description: "Check for uneven treatment, harmful stereotypes, and biased patterns." },
  { id: "bias", title: "Bias", description: "Check whether the AI favors or penalizes people unfairly." },
  { id: "safety", title: "Safety", description: "Check for unsafe advice, policy failures, and refusal quality." }
];

const systemTypes = [
  { id: "customer-support-chatbot", title: "Customer support chatbot" },
  { id: "internal-ai-assistant", title: "Internal AI assistant" },
  { id: "public-website-chatbot", title: "Public website chatbot" },
  { id: "knowledge-assistant", title: "Knowledge assistant" }
];

const targetTypes = [
  {
    id: "github-change",
    title: "A prompt or config change",
    description: "Use this when you want to review a GitHub change before release."
  },
  {
    id: "live-website",
    title: "A live website with AI features",
    description: "Use this when the AI exists on a website as a chatbot, assistant, AI search, or summary feature."
  }
];

const websiteFeatureTypes = [
  { id: "ai-assistant", title: "AI assistant or chatbot" },
  { id: "ai-search", title: "AI search or answer box" },
  { id: "ai-summary", title: "AI summaries or recommendations" },
  { id: "ai-writing", title: "AI writing or help feature" }
];

const reportTypes = [
  { id: "executive", title: "Executive report", description: "Plain-language summary, issues found, and what to do next." },
  { id: "technical", title: "Technical report", description: "Detailed evidence, logs, and model outputs for reviewers." },
  { id: "both", title: "Both reports", description: "Give decision-makers the summary and reviewers the deeper evidence." }
];

export default function HomePage() {
  return (
    <div className="stack">
      <section className="hero wizard-hero">
        <p className="muted">Guided assessment wizard</p>
        <h2>Point, shoot, and let AI test AI for security, fairness, bias, and safety issues.</h2>
        <p>
          Pick what kind of AI you are reviewing, choose the risks you care about, and launch an assessment. You will get
          an executive summary for non-technical readers and technical evidence for reviewers.
        </p>
      </section>

      <section className="panel card wizard-panel">
        <form action="/api/manual-runs" method="get" className="stack">
          <input type="hidden" name="mode" value="guided" />

          <div className="wizard-step">
            <div>
              <p className="wizard-step-label">Step 1</p>
              <h3>What are you testing?</h3>
              <p className="muted">Choose whether you are reviewing a GitHub change or a live website with AI features.</p>
            </div>
            <div className="wizard-option-grid">
              {targetTypes.map((option, index) => (
                <label key={option.id} className="wizard-option-card">
                  <input type="radio" name="targetType" value={option.id} defaultChecked={index === 0} />
                  <span>
                    <strong>{option.title}</strong>
                    <small>{option.description}</small>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="wizard-step">
            <div>
              <p className="wizard-step-label">Step 2</p>
              <h3>What kind of AI are you checking?</h3>
              <p className="muted">Choose the closest match. This helps the assessment use the right tone and examples.</p>
            </div>
            <div className="wizard-option-grid">
              {systemTypes.map((option, index) => (
                <label key={option.id} className="wizard-option-card">
                  <input type="radio" name="systemType" value={option.id} defaultChecked={index === 0} />
                  <span>
                    <strong>{option.title}</strong>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="wizard-step">
            <div>
              <p className="wizard-step-label">Step 3</p>
              <h3>If this is a live website, what should we check?</h3>
              <p className="muted">You can fill this in now. If you are reviewing a GitHub change, you can leave it as-is.</p>
            </div>
            <div className="wizard-fields">
              <label className="wizard-field">
                <span>Website URL</span>
                <input
                  type="url"
                  name="websiteUrl"
                  placeholder="https://example.com/ai-assistant"
                />
              </label>
              <label className="wizard-field">
                <span>AI feature type</span>
                <select name="websiteFeature" defaultValue="ai-assistant">
                  {websiteFeatureTypes.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="wizard-step">
            <div>
              <p className="wizard-step-label">Step 4</p>
              <h3>What do you want to check?</h3>
              <p className="muted">Pick one or more risk areas. The assessment will focus its review on these concerns.</p>
            </div>
            <div className="wizard-option-grid">
              {concernOptions.map((option, index) => (
                <label key={option.id} className="wizard-option-card">
                  <input type="checkbox" name="concern" value={option.id} defaultChecked={index === 0} />
                  <span>
                    <strong>{option.title}</strong>
                    <small>{option.description}</small>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="wizard-step">
            <div>
              <p className="wizard-step-label">Step 5</p>
              <h3>What kind of report do you need?</h3>
              <p className="muted">Choose the report style that fits your audience.</p>
            </div>
            <div className="wizard-option-grid">
              {reportTypes.map((option, index) => (
                <label key={option.id} className="wizard-option-card">
                  <input type="radio" name="reportType" value={option.id} defaultChecked={index === reportTypes.length - 1} />
                  <span>
                    <strong>{option.title}</strong>
                    <small>{option.description}</small>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="wizard-launch">
            <button className="button button-primary" type="submit">
              Start Assessment
            </button>
            <a className="button button-secondary" href="/dashboard">
              View existing assessments
            </a>
          </div>
        </form>
      </section>

      <section className="grid-3">
        <div className="panel card">
          <h3>Executive report</h3>
          <p className="muted">Plain-language outcome, top issues, severity, and recommended next steps.</p>
        </div>
        <div className="panel card">
          <h3>Technical report</h3>
          <p className="muted">Detailed model responses, evidence files, checks, and technical notes for reviewers.</p>
        </div>
        <div className="panel card">
          <h3>Website AI testing</h3>
          <p className="muted">Point the wizard at a website with AI-powered features and queue a live website assessment.</p>
        </div>
      </section>
    </div>
  );
}
