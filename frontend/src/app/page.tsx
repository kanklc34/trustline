"use client";

import { useState } from "react";
import { API_BASE_URL } from "@/lib/config";

interface AgentResult {
  phone_number: string;
  trust_score: number;
  decision: string;
  reasoning: string;
  signal_breakdown?: {
    signal: string;
    impact: "positive" | "negative" | "neutral";
    points: number;
    note: string;
  }[];
  signals: {
    sim_swap: Record<string, unknown>;
    number_verification: { status?: string; verified?: boolean; [key: string]: unknown };
    device_status?: Record<string, unknown>;
  };
}

// Inline SVG Spinner (no extra deps)
function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4 text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export default function Home() {
  const [phoneNumber, setPhoneNumber] = useState("+99999991000");
  const [actionType, setActionType] = useState("login");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);
  const [result, setResult] = useState<AgentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const validatePhone = (value: string): string | null => {
    if (!value.trim()) return "Phone number is required.";
    if (value.trim().length < 6) return "Enter a valid phone number.";
    return null;
  };

  const checkTrust = async () => {
    const validationError = validatePhone(phoneNumber);
    if (validationError) {
      setPhoneError(validationError);
      return;
    }
    setPhoneError(null);
    setLoading(true);
    setProgress([]);
    setResult(null);
    setError(null);

    try {
      // Step 1: Collect
      setProgress(["📡 [collect_signals] Collecting signals (SIM Swap, Number Verification)..."]);
      await new Promise((r) => setTimeout(r, 800));

      // Step 2: Evaluate
      setProgress((prev) => [...prev, "🧠 [evaluate_risk] AI Agent is performing risk evaluation (Gemini)..."]);

      const res = await fetch(`${API_BASE_URL}/api/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: phoneNumber, action_type: actionType }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.detail || "Evaluation failed");
      }

      await new Promise((r) => setTimeout(r, 800));

      // Step 3: Decide
      setProgress((prev) => [...prev, `⚖️ [decide] Running decision engine... Score: ${data.data.trust_score}`]);
      await new Promise((r) => setTimeout(r, 600));

      setResult(data.data);
      setProgress((prev) => [...prev, "✅ [explain] Analysis and packaging complete."]);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const getDecisionColor = (decision: string) => {
    if (decision === "APPROVE") return "bg-green-50 text-green-700 border-green-200";
    if (decision === "STEP_UP_VERIFICATION") return "bg-yellow-50 text-yellow-700 border-yellow-200";
    if (decision === "BLOCK") return "bg-red-50 text-red-700 border-red-200";
    return "bg-gray-50 text-gray-700 border-gray-200";
  };

  const staggerClass = (idx: number) =>
    `animate-stagger-${Math.min(idx, 4)}`;

  return (
    <main className="min-h-screen p-6 sm:p-8 text-tl-navy bg-tl-bg">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* ── Header ── */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M20 4L4 10V20C4 28.84 10.95 37.04 20 40C29.05 37.04 36 28.84 36 20V10L20 4Z" fill="#0EA5E9" fillOpacity="0.1" stroke="#0EA5E9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 26V18" stroke="#0EA5E9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M20 26V14" stroke="#0EA5E9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M26 26V20" stroke="#0EA5E9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">TrustLine</h1>
              <p className="text-tl-navy-light text-sm mt-0.5">Telecom Risk Intelligence</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {/* Live sandbox badge */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 border border-green-200 rounded-full text-xs font-medium text-green-700">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" aria-hidden="true" />
              Live sandbox environment
            </span>
            <a
              href="/dashboard"
              className="text-sm text-tl-accent hover:text-tl-accent-hover font-medium transition-colors"
            >
              Partner Dashboard &rarr;
            </a>
          </div>
        </header>

        {/* ── Form ── */}
        <section className="bg-tl-surface p-6 rounded-xl shadow-sm border border-gray-100 space-y-5">
          {/* Phone number */}
          <div>
            <label htmlFor="phone-input" className="block text-sm font-medium text-tl-navy-light mb-1.5">
              Phone Number
            </label>
            <input
              id="phone-input"
              type="text"
              value={phoneNumber}
              onChange={(e) => {
                setPhoneNumber(e.target.value);
                if (phoneError) setPhoneError(validatePhone(e.target.value));
              }}
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-tl-accent focus:border-tl-accent outline-none transition-shadow text-sm ${
                phoneError ? "border-red-400 bg-red-50" : "border-gray-200"
              }`}
              placeholder="+99999991000"
              aria-describedby={phoneError ? "phone-error" : undefined}
              aria-invalid={!!phoneError}
            />
            {phoneError && (
              <p id="phone-error" className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {phoneError}
              </p>
            )}
          </div>

          {/* Action type */}
          <div>
            <label htmlFor="action-type" className="block text-sm font-medium text-tl-navy-light mb-1.5">
              Action Type
            </label>
            <select
              id="action-type"
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-tl-accent focus:border-tl-accent outline-none transition-shadow text-sm bg-white"
            >
              <option value="login">Login</option>
              <option value="checkout">Checkout</option>
              <option value="password_reset">Password Reset</option>
            </select>
          </div>

          {/* Submit button */}
          <button
            onClick={checkTrust}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 bg-tl-accent hover:bg-tl-accent-hover text-white font-semibold py-3 px-4 rounded-lg transition-colors shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-tl-accent focus:ring-offset-2"
          >
            {loading ? (
              <>
                <Spinner />
                Analyzing...
              </>
            ) : (
              "Check Trust"
            )}
          </button>

          {/* Demo numbers hint */}
          <div className="text-xs text-tl-navy-light p-3 bg-gray-50 rounded-lg border border-gray-100">
            <strong className="block mb-2">Demo numbers:</strong>
            <ul className="space-y-1">
              <li><span className="text-tl-success font-mono font-medium">+99999991000</span> — Clean number (APPROVE)</li>
              <li><span className="text-tl-danger font-mono font-medium">+90000000001</span> — SIM Swap detected (demo scenario) (BLOCK)</li>
              <li><span className="text-tl-warning font-mono font-medium">+90000000003</span> — Number Verification pending (demo scenario) (STEP_UP_VERIFICATION)</li>
            </ul>
          </div>
        </section>

        {/* ── Error State ── */}
        {error && (
          <section
            role="alert"
            className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl animate-fade-in"
          >
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856C18.07 20 19 18.879 19 17.5c0-.45-.108-.876-.3-1.252L13.7 5.252A2.001 2.001 0 0012 4a2 2 0 00-1.7.952l-5 10.996C4.108 16.624 4 17.05 4 17.5c0 1.379.93 2.5 2.062 2.5z" />
            </svg>
            <div>
              <p className="font-semibold text-sm">Something went wrong while checking this number.</p>
              <p className="text-xs mt-1 opacity-80">{error} — Please try again.</p>
            </div>
          </section>
        )}

        {/* ── Progress Terminal ── */}
        {progress.length > 0 && (
          <section className="bg-tl-navy text-tl-accent p-4 rounded-xl font-mono text-sm space-y-2 shadow-inner" aria-live="polite" aria-label="Analysis progress">
            {progress.map((msg, idx) => (
              <div key={idx} className={staggerClass(idx)}>
                {msg}
              </div>
            ))}
          </section>
        )}

        {/* ── Result Card ── */}
        {result && (
          <section className="bg-tl-surface p-6 rounded-xl shadow-sm border border-gray-100 space-y-6 animate-slide-up">
            {/* Header row */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h2 className="text-2xl font-semibold text-tl-navy">Analysis Result</h2>
              <div className="text-right">
                <div className="text-xs text-tl-navy-light uppercase tracking-wider font-semibold mb-1">Trust Score</div>
                <div
                  className={`text-4xl font-bold tracking-tighter ${
                    result.trust_score >= 70
                      ? "text-tl-success"
                      : result.trust_score >= 40
                      ? "text-tl-warning"
                      : "text-tl-danger"
                  }`}
                >
                  {result.trust_score}/100
                </div>
              </div>
            </div>

            {/* Decision badge */}
            <div className={`p-4 rounded-lg border shadow-sm animate-scale-in ${getDecisionColor(result.decision)}`}>
              <div className="font-bold uppercase mb-1 tracking-wide flex items-center gap-2">
                {result.decision === "APPROVE" && "✅"}
                {result.decision === "STEP_UP_VERIFICATION" && "⚠️"}
                {result.decision === "BLOCK" && "🚫"}
                Decision: {result.decision}
              </div>
              <div className="text-sm font-medium opacity-90">{result.reasoning}</div>
            </div>

            {/* Signals */}
            <div className="space-y-3">
              <h3 className="font-semibold text-tl-navy border-b border-gray-100 pb-2">Signals Used (CAMARA)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 shadow-sm">
                  <div className="text-xs text-tl-navy-light mb-2 font-semibold uppercase tracking-wider">SIM Swap Check</div>
                  <pre className="font-mono text-xs bg-white p-2 rounded border border-gray-100 overflow-x-auto text-gray-800">
                    {JSON.stringify(result.signals.sim_swap, null, 2)}
                  </pre>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="text-xs text-tl-navy-light mb-2 font-semibold uppercase tracking-wider">Number Verification</div>
                    <pre className="font-mono text-xs bg-white p-2 rounded border border-gray-100 overflow-x-auto text-gray-800">
                      {JSON.stringify(result.signals.number_verification, null, 2)}
                    </pre>
                  </div>
                  {result.signals.number_verification?.status === "pending" && (
                    <a
                      href={`${API_BASE_URL}/auth/number-verification/start?phone_number=${encodeURIComponent(result.phone_number)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-tl-accent hover:bg-tl-accent-hover text-white text-sm font-semibold rounded-lg transition-colors shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-tl-accent focus:ring-offset-2"
                    >
                      Start OAuth Verification
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 shadow-sm">
                  <div className="text-xs text-tl-navy-light mb-2 font-semibold uppercase tracking-wider">Device Status</div>
                  <pre className="font-mono text-xs bg-white p-2 rounded border border-gray-100 overflow-x-auto text-gray-800">
                    {JSON.stringify(result.signals.device_status || {}, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            {/* Audit Trail */}
            {result.signal_breakdown && result.signal_breakdown.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-tl-navy border-b border-gray-100 pb-2">Why this decision? (Audit Trail)</h3>
                <div className="space-y-2">
                  {result.signal_breakdown.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="mt-0.5">
                        {item.impact === "positive" && <span className="text-tl-success text-lg" title="Positive">▲</span>}
                        {item.impact === "negative" && <span className="text-tl-danger text-lg" title="Negative">▼</span>}
                        {item.impact === "neutral" && <span className="text-gray-400 text-lg" title="Neutral">—</span>}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm capitalize">{item.signal.replace("_", " ")}</span>
                          <span
                            className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                              item.points > 0
                                ? "bg-green-100 text-green-700"
                                : item.points < 0
                                ? "bg-red-100 text-red-700"
                                : "bg-gray-200 text-gray-700"
                            }`}
                          >
                            {item.points > 0 ? `+${item.points}` : item.points}
                          </span>
                        </div>
                        <p className="text-sm text-tl-navy-light mt-1">{item.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
