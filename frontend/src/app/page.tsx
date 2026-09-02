"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
    number_verification: {
      status?: string;
      verified?: boolean;
      _demo_scenario?: boolean;
      [key: string]: unknown;
    };
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

function HomeContent() {
  const searchParams = useSearchParams();
  const [phoneNumber, setPhoneNumber] = useState("+99999991001");
  const [actionType, setActionType] = useState("login");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);
  const [result, setResult] = useState<AgentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [verificationNotice, setVerificationNotice] = useState<{
    status: "completed" | "failed";
    verified?: boolean;
    phoneNumber: string;
    reason?: string;
  } | null>(null);
  // Set right after an OAuth redirect with verified=true; consumed by the
  // effect below to auto re-run Check Trust once checkTrust is defined.
  const [pendingAutoCheck, setPendingAutoCheck] = useState<string | null>(null);
  // Anchors the progress/result area so we can scroll it into view once a
  // check starts — otherwise the result renders below the fold and the user
  // has to manually scroll down to notice anything happened (especially
  // jarring right after the auto re-check that follows OAuth verification).
  const resultAreaRef = useRef<HTMLDivElement | null>(null);
  // Set to true right when a user-triggered (non-silent) check starts;
  // consumed by the effect below once the progress section has actually
  // rendered, so the scroll fires after React commits the DOM change
  // instead of racing it via requestAnimationFrame.
  const [shouldScrollToResult, setShouldScrollToResult] = useState(false);

  // Pick up the ?verification=completed|failed&verified=...&phone_number=...
  // query params that the backend redirects to after the OAuth consent flow
  // finishes, so the user sees a clear confirmation instead of landing on a
  // bare JSON response. When verification succeeded, automatically re-run
  // Check Trust for that number so the user sees the updated score/decision
  // without having to click anything.
  useEffect(() => {
    const verification = searchParams.get("verification");
    const phone = searchParams.get("phone_number");
    if (!verification || !phone) return;

    if (verification === "completed") {
      const verified = searchParams.get("verified") === "true";
      setVerificationNotice({ status: "completed", verified, phoneNumber: phone });
      setPhoneNumber(phone);
      if (verified) {
        setPendingAutoCheck(phone);
      }
    } else if (verification === "failed") {
      const reason = searchParams.get("reason") || undefined;
      setVerificationNotice({ status: "failed", phoneNumber: phone, reason });
      setPhoneNumber(phone);
    }

    // Clean the query params from the URL so a page refresh doesn't re-show the notice.
    window.history.replaceState({}, "", window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validatePhone = (value: string): string | null => {
    if (!value.trim()) return "Phone number is required.";
    if (value.trim().length < 6) return "Enter a valid phone number.";
    return null;
  };

  const checkTrust = async (overridePhoneNumber?: string, options?: { silent?: boolean }) => {
    const phoneToCheck = overridePhoneNumber ?? phoneNumber;
    const validationError = validatePhone(phoneToCheck);
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

      // Only auto-scroll when the user explicitly triggered this (clicked
      // the button) — for the automatic re-check after OAuth, the user is
      // already looking at this part of the page, so jumping the viewport
      // again would be jarring rather than helpful. The actual scroll
      // happens in the effect below, once the progress section has
      // rendered in the DOM.
      if (!options?.silent) {
        setShouldScrollToResult(true);
      }

      await new Promise((r) => setTimeout(r, 800));

      // Step 2: Evaluate
      setProgress((prev) => [...prev, "🧠 [evaluate_risk] AI Agent is performing risk evaluation (Gemini)..."]);

      const res = await fetch(`${API_BASE_URL}/api/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: phoneToCheck, action_type: actionType }),
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
      // Once the fresh result is in, the "refreshing the trust score" notice
      // has served its purpose — clear it so it doesn't sit there stale next
      // to an already-updated result.
      if (options?.silent) {
        setVerificationNotice(null);
      }
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // Scrolls the progress/result section into view once it has actually
  // rendered in the DOM (progress went from empty to non-empty). Using an
  // effect keyed on `progress` guarantees this runs after React commits the
  // new DOM node, unlike requestAnimationFrame right after setProgress,
  // which can race React's batched update and fire before the section exists.
  useEffect(() => {
    if (!shouldScrollToResult || progress.length === 0) return;
    setShouldScrollToResult(false);
    resultAreaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [progress, shouldScrollToResult]);

  // Auto re-run Check Trust once, right after a successful OAuth verification
  // redirect, so the user sees the updated score without lifting a finger.
  // Runs "silently": no extra scroll jump, and the notice above clears once done.
  useEffect(() => {
    if (!pendingAutoCheck) return;
    const phone = pendingAutoCheck;
    setPendingAutoCheck(null);
    checkTrust(phone, { silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAutoCheck]);

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
              <path d="M20 3L5 9V19C5 28.5 11.5 36.5 20 39V3Z" fill="#0EA5E9"/>
              <path d="M20 3L35 9V19C35 28.5 28.5 36.5 20 39V3Z" fill="#0369A1"/>
              <path d="M13 24V18" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M20 24V14" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M27 24V20" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
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

        {/* ── OAuth verification result notice ── */}
        {verificationNotice && (
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 text-sm ${
              verificationNotice.status === "completed" && verificationNotice.verified
                ? "bg-green-50 border-green-200 text-green-800"
                : verificationNotice.status === "completed" && !verificationNotice.verified
                ? "bg-yellow-50 border-yellow-200 text-yellow-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            {verificationNotice.status === "completed" && verificationNotice.verified && (
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {verificationNotice.status === "completed" && !verificationNotice.verified && (
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            )}
            {verificationNotice.status === "failed" && (
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            )}
            <div>
              <p className="font-semibold">
                {verificationNotice.status === "completed" && verificationNotice.verified &&
                  "Number Verification successful"}
                {verificationNotice.status === "completed" && !verificationNotice.verified &&
                  "Number Verification completed — not verified"}
                {verificationNotice.status === "failed" && "Number Verification failed"}
              </p>
              <p className="mt-0.5 opacity-90">
                {verificationNotice.status === "completed" && verificationNotice.verified &&
                  `${verificationNotice.phoneNumber} is confirmed to match the device via OAuth. Updating the trust score below...`}
                {verificationNotice.status === "completed" && !verificationNotice.verified &&
                  `The OAuth flow completed for ${verificationNotice.phoneNumber}, but the number could not be verified as matching the device.`}
                {verificationNotice.status === "failed" &&
                  `A network or provider error occurred while verifying ${verificationNotice.phoneNumber}${verificationNotice.reason ? `: ${verificationNotice.reason}` : "."} You can try again.`}
              </p>
            </div>
          </div>
        )}

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
              placeholder="+99999991001"
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
            onClick={() => checkTrust()}
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
              <li><span className="text-tl-success font-mono font-medium">+99999991001</span> — Clean SIM (Nokia-confirmed) (STEP_UP_VERIFICATION until OAuth is completed, then APPROVE)</li>
              <li><span className="text-tl-danger font-mono font-medium">+99999991000</span> — SIM Swap detected (Nokia-confirmed) (BLOCK)</li>
              <li><span className="text-tl-danger font-mono font-medium">+90000000001</span> — SIM Swap detected, fallback demo scenario (BLOCK)</li>
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
          <section
            ref={resultAreaRef}
            className="bg-tl-navy text-tl-accent p-4 rounded-xl font-mono text-sm space-y-2 shadow-inner"
            aria-live="polite"
            aria-label="Analysis progress"
          >
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
                  <pre className="font-mono text-xs bg-white p-2 rounded border border-gray-100 text-gray-800 whitespace-pre-wrap break-words">
                    {JSON.stringify(result.signals.sim_swap, null, 2)}
                  </pre>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="text-xs text-tl-navy-light mb-2 font-semibold uppercase tracking-wider">Number Verification</div>
                    <pre className="font-mono text-xs bg-white p-2 rounded border border-gray-100 text-gray-800 whitespace-pre-wrap break-words">
                      {JSON.stringify(result.signals.number_verification, null, 2)}
                    </pre>
                  </div>
                  {result.signals.number_verification?.status === "pending" &&
                    !result.signals.number_verification?._demo_scenario && (
                    <a
                      href={`${API_BASE_URL}/auth/number-verification/start?phone_number=${encodeURIComponent(result.phone_number)}`}
                      className="mt-4 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-tl-accent hover:bg-tl-accent-hover text-white text-sm font-semibold rounded-lg transition-colors shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-tl-accent focus:ring-offset-2"
                    >
                      Start OAuth Verification
                    </a>
                  )}
                  {result.signals.number_verification?.status === "pending" &&
                    result.signals.number_verification?._demo_scenario && (
                    <p className="mt-4 text-xs text-tl-navy-light italic">
                      This demo number always shows &quot;pending&quot; verification to reliably demonstrate the STEP_UP_VERIFICATION scenario. Try a real number (e.g. +99999991001) to test the live OAuth flow.
                    </p>
                  )}
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 shadow-sm">
                  <div className="text-xs text-tl-navy-light mb-2 font-semibold uppercase tracking-wider">Device Status</div>
                  <pre className="font-mono text-xs bg-white p-2 rounded border border-gray-100 text-gray-800 whitespace-pre-wrap break-words">
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

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
