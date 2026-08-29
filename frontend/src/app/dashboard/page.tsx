"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface DashboardSummary {
  summary: {
    total: number;
    approved: number;
    blocked: number;
    step_up: number;
  };
  history: {
    timestamp: string;
    phone_number: string;
    decision: string;
    trust_score: number;
  }[];
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/dashboard-summary");
        if (!res.ok) throw new Error("Veri çekilemedi");
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
    if (decision === "APPROVE") return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">APPROVE</span>;
    if (decision === "BLOCK") return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">BLOCK</span>;
    if (decision === "STEP_UP_VERIFICATION") return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">STEP UP</span>;
    return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-semibold">{decision}</span>;
  };

  return (
    <main className="min-h-screen p-8 font-sans text-gray-900 bg-gray-50">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-blue-900 tracking-tight">Partner Dashboard</h1>
            <p className="text-gray-500 mt-1">Gerçek zamanlı TrustLine risk değerlendirmeleri özeti</p>
          </div>
          <Link href="/" className="text-sm font-medium text-blue-600 hover:text-blue-800">
            &larr; Ana Sayfaya Dön
          </Link>
        </header>

        {loading && <p className="text-gray-500">Yükleniyor...</p>}
        {error && <p className="text-red-500">Hata: {error}</p>}
        
        {data && (
          <>
            {/* Summary Cards */}
            <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="text-sm text-gray-500 font-medium mb-1">Toplam İşlem</div>
                <div className="text-3xl font-bold">{data.summary.total}</div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-green-200 border-l-4 border-l-green-500">
                <div className="text-sm text-gray-500 font-medium mb-1">Onaylanan</div>
                <div className="text-3xl font-bold text-green-700">{data.summary.approved}</div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-red-200 border-l-4 border-l-red-500">
                <div className="text-sm text-gray-500 font-medium mb-1">Engellenen</div>
                <div className="text-3xl font-bold text-red-700">{data.summary.blocked}</div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-yellow-200 border-l-4 border-l-yellow-500">
                <div className="text-sm text-gray-500 font-medium mb-1">Ek Doğrulama</div>
                <div className="text-3xl font-bold text-yellow-700">{data.summary.step_up}</div>
              </div>
            </section>

            {/* History Table */}
            <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-800">Son İşlemler</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3">Zaman</th>
                      <th className="px-6 py-3">Numara</th>
                      <th className="px-6 py-3">Trust Score</th>
                      <th className="px-6 py-3">Karar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.history.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                          Henüz hiç işlem yapılmadı.
                        </td>
                      </tr>
                    ) : (
                      data.history.map((record, idx) => (
                        <tr key={idx} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                            {new Date(record.timestamp).toLocaleString("tr-TR")}
                          </td>
                          <td className="px-6 py-4 font-mono font-medium text-gray-900">
                            {record.phone_number}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`font-bold ${record.trust_score >= 70 ? 'text-green-600' : record.trust_score >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                              {record.trust_score}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {getDecisionBadge(record.decision)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
