"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/config";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  DollarSign,
  Activity,
  ClipboardList,
} from "lucide-react";

interface DashboardSummary {
  summary: {
    total: number;
    approved: number;
    blocked: number;
    step_up: number;
    estimated_fraud_prevented: number;
  };
  history: {
    timestamp: string;
    phone_number: string;
    decision: string;
    trust_score: number;
  }[];
}

// Custom recharts tooltip styled to match TrustLine design
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-tl-navy text-white px-3 py-2 rounded-lg shadow-lg text-xs font-medium">
        <p className="text-tl-accent font-semibold mb-0.5">{label}</p>
        <p>Score: <span className="font-bold">{payload[0].value}</span></p>
      </div>
    );
  }
  return null;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/dashboard-summary`);
        if (!res.ok) throw new Error("Failed to fetch data");
        const json = await res.json();
        setData(json);
      } catch (err: unknown) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const getDecisionBadge = (decision: string) => {
    if (decision === "APPROVE")
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
          <CheckCircle className="w-3 h-3" />
          APPROVE
        </span>
      );
    if (decision === "BLOCK")
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
          <XCircle className="w-3 h-3" />
          BLOCK
        </span>
      );
    if (decision === "STEP_UP_VERIFICATION")
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
          <AlertTriangle className="w-3 h-3" />
          STEP UP
        </span>
      );
    return (
      <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">
        {decision}
      </span>
    );
  };

  // Format data for Recharts
  const chartData =
    data?.history
      .slice()
      .reverse()
      .map((r, i) => ({
        name: `Txn ${i + 1}`,
        score: r.trust_score,
      })) || [];

  return (
    <main className="min-h-screen p-6 sm:p-8 text-tl-navy bg-tl-bg">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* ── Header ── */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg
              width="32"
              height="32"
              viewBox="0 0 40 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M20 3L5 9V19C5 28.5 11.5 36.5 20 39V3Z"
                fill="#0EA5E9"
              />
              <path
                d="M20 3L35 9V19C35 28.5 28.5 36.5 20 39V3Z"
                fill="#0369A1"
              />
              <path d="M13 24V18" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M20 24V14" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M27 24V20" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Partner Dashboard</h1>
              <p className="text-tl-navy-light mt-0.5 text-sm">
                Real-time TrustLine risk evaluation summary
              </p>
            </div>
          </div>
          <Link
            href="/"
            className="text-sm font-medium text-tl-accent hover:text-tl-accent-hover transition-colors focus:outline-none focus:ring-2 focus:ring-tl-accent focus:ring-offset-2 rounded"
          >
            &larr; Back to Home
          </Link>
        </header>

        {/* ── Loading State ── */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 animate-fade-in">
            <svg
              className="animate-spin h-8 w-8 text-tl-accent"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <p className="text-tl-navy-light text-sm font-medium">Loading dashboard data…</p>
          </div>
        )}

        {/* ── Error State ── */}
        {error && (
          <section
            role="alert"
            className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 p-5 rounded-xl animate-fade-in"
          >
            <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Failed to load dashboard data.</p>
              <p className="text-xs mt-1 opacity-80">{error} — Try refreshing the page.</p>
            </div>
          </section>
        )}

        {data && (
          <>
            {/* ── Summary Cards ── */}
            <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {/* Total */}
              <div className="col-span-2 md:col-span-1 bg-tl-surface p-5 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="w-4 h-4 text-tl-accent" />
                  <div className="text-xs text-tl-navy-light font-medium uppercase tracking-wider">Total</div>
                </div>
                <div className="text-3xl font-bold text-tl-navy">{data.summary.total}</div>
              </div>

              {/* Approved */}
              <div className="bg-tl-surface p-5 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-4 h-4 text-tl-success" />
                  <div className="text-xs text-tl-navy-light font-medium uppercase tracking-wider">Approved</div>
                </div>
                <div className="text-3xl font-bold text-tl-success">{data.summary.approved}</div>
              </div>

              {/* Blocked */}
              <div className="bg-tl-surface p-5 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <XCircle className="w-4 h-4 text-tl-danger" />
                  <div className="text-xs text-tl-navy-light font-medium uppercase tracking-wider">Blocked</div>
                </div>
                <div className="text-3xl font-bold text-tl-danger">{data.summary.blocked}</div>
              </div>

              {/* Step-up */}
              <div className="bg-tl-surface p-5 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-tl-warning" />
                  <div className="text-xs text-tl-navy-light font-medium uppercase tracking-wider">Step-up</div>
                </div>
                <div className="text-3xl font-bold text-tl-warning">{data.summary.step_up}</div>
              </div>

              {/* Fraud Prevented */}
              <div className="bg-tl-surface p-5 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="w-4 h-4 text-tl-accent" />
                  <div className="text-xs text-tl-navy-light font-medium uppercase tracking-wider">Fraud Prevented</div>
                </div>
                <div className="text-3xl font-bold text-tl-accent">
                  ${data.summary.estimated_fraud_prevented}
                </div>
                <div className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">
                  (Example Scenario)
                </div>
              </div>
            </section>

            {/* ── Trend Chart ── */}
            <section className="bg-tl-surface p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-tl-navy mb-4">
                Risk Score Trend (Recent Transactions)
              </h2>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="name"
                      stroke="#94a3b8"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, 100]}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#0ea5e9"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#0ea5e9", strokeWidth: 0 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* ── History Table ── */}
            <section className="bg-tl-surface rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-tl-navy-light" />
                <h2 className="text-lg font-semibold text-tl-navy">Recent Transactions</h2>
              </div>

              {data.history.length === 0 ? (
                /* Empty State */
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <ClipboardList className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="font-semibold text-tl-navy">No checks yet</p>
                  <p className="text-sm text-gray-400 max-w-xs">
                    Run your first trust check to see it here.
                  </p>
                  <Link
                    href="/"
                    className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-tl-accent hover:bg-tl-accent-hover text-white text-sm font-semibold rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-tl-accent focus:ring-offset-2"
                  >
                    Run a Trust Check &rarr;
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-tl-navy-light">
                    <thead className="text-xs text-gray-400 uppercase bg-gray-50/50 border-b border-gray-100 tracking-wider">
                      <tr>
                        <th className="px-6 py-3 font-medium">Time</th>
                        <th className="px-6 py-3 font-medium">Number</th>
                        <th className="px-6 py-3 font-medium">Trust Score</th>
                        <th className="px-6 py-3 font-medium">Decision</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.history.map((record, idx) => (
                        <tr
                          key={idx}
                          className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                            {new Date(record.timestamp).toLocaleString("en-US")}
                          </td>
                          <td className="px-6 py-4 font-mono font-medium text-tl-navy">
                            {record.phone_number}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`font-bold ${
                                record.trust_score >= 70
                                  ? "text-tl-success"
                                  : record.trust_score >= 40
                                  ? "text-tl-warning"
                                  : "text-tl-danger"
                              }`}
                            >
                              {record.trust_score}
                            </span>
                          </td>
                          <td className="px-6 py-4">{getDecisionBadge(record.decision)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
