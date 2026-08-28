"use client";

import { useState } from "react";

interface AgentResult {
  phone_number: string;
  trust_score: number;
  decision: string;
  reasoning: string;
  signals: {
    sim_swap: Record<string, unknown>;
    number_verification: { status?: string; verified?: boolean; [key: string]: unknown };
  };
}

export default function Home() {
  const [phoneNumber, setPhoneNumber] = useState("+99999991000");
  const [actionType, setActionType] = useState("login");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);
  const [result, setResult] = useState<AgentResult | null>(null);

  const checkTrust = async () => {
    setLoading(true);
    setProgress([]);
    setResult(null);

    try {
      // Step 1: Collect
      setProgress((prev) => [...prev, "📡 [collect_signals] Sinyaller toplanıyor (SIM Swap, Number Verification)..."]);
      // UI akışını (düşünme sürecini) göstermek için küçük yapay gecikmeler koyuyoruz
      await new Promise((r) => setTimeout(r, 800)); 

      // Step 2: Evaluate
      setProgress((prev) => [...prev, "🧠 [evaluate_risk] AI Ajanı risk değerlendirmesi yapıyor (Gemini 2.5 Flash)..."]);
      
      const res = await fetch("http://localhost:8000/api/evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone_number: phoneNumber, action_type: actionType }),
      });
      
      const data = await res.json();
      
      if (!data.success) {
        throw new Error(data.detail || "Değerlendirme başarısız");
      }

      await new Promise((r) => setTimeout(r, 800));
      
      // Step 3: Decide
      setProgress((prev) => [...prev, `⚖️ [decide] Karar mekanizması çalıştırılıyor... Skor: ${data.data.trust_score}`]);
      await new Promise((r) => setTimeout(r, 600));

      setResult(data.data);
      setProgress((prev) => [...prev, "✅ [explain] Analiz ve paketleme tamamlandı."]);
      
    } catch (error: unknown) {
      const err = error as Error;
      setProgress((prev) => [...prev, `❌ Hata: ${err.message}`]);
    } finally {
      setLoading(false);
    }
  };

  const getDecisionColor = (decision: string) => {
    if (decision === "APPROVE") return "bg-green-100 text-green-800 border-green-300";
    if (decision === "STEP_UP_VERIFICATION") return "bg-yellow-100 text-yellow-800 border-yellow-300";
    if (decision === "BLOCK") return "bg-red-100 text-red-800 border-red-300";
    return "bg-gray-100 text-gray-800 border-gray-300";
  };

  return (
    <main className="min-h-screen p-8 font-sans text-gray-900">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-blue-900 tracking-tight">TrustLine</h1>
          <p className="text-gray-500">AI-Powered Real-Time Trust Score using CAMARA Network Signals</p>
        </header>

        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefon Numarası</label>
            <input 
              type="text" 
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
              placeholder="+99999991000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">İşlem Tipi</label>
            <select 
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
            >
              <option value="login">Login (Giriş)</option>
              <option value="checkout">Checkout (Ödeme/Alışveriş)</option>
              <option value="password_reset">Password Reset (Şifre Sıfırlama)</option>
            </select>
          </div>
          <button 
            onClick={checkTrust}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:bg-blue-300"
          >
            {loading ? "Analiz Ediliyor..." : "Check Trust (Güvenliği Denetle)"}
          </button>
          
          <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-50 rounded border border-gray-100">
            <strong>Simülatör numaraları:</strong><br />
            <span className="text-green-700 font-mono">+99999991000</span> (Temiz)<br />
            <span className="text-red-700 font-mono">+99999990404</span> (SIM Swap yapılmış)<br />
            <span className="text-yellow-700 font-mono">+99999990500</span> (Cihazla eşleşmeyen/şüpheli numara)
          </div>
        </section>

        {progress.length > 0 && (
          <section className="bg-gray-900 text-green-400 p-4 rounded-xl font-mono text-sm space-y-2 shadow-inner border border-gray-800">
            {progress.map((msg, idx) => (
              <div key={idx} className="animate-fade-in">{msg}</div>
            ))}
          </section>
        )}

        {result && (
          <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6 animate-slide-up">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h2 className="text-2xl font-semibold text-gray-800">Analiz Sonucu</h2>
              <div className="text-right">
                <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Trust Score</div>
                <div className={`text-4xl font-bold tracking-tighter ${result.trust_score >= 70 ? 'text-green-600' : result.trust_score >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {result.trust_score}/100
                </div>
              </div>
            </div>

            <div className={`p-4 rounded-lg border-2 shadow-sm ${getDecisionColor(result.decision)}`}>
              <div className="font-bold uppercase mb-1 tracking-wide flex items-center gap-2">
                {result.decision === "APPROVE" && "✅"}
                {result.decision === "STEP_UP_VERIFICATION" && "⚠️"}
                {result.decision === "BLOCK" && "🚫"}
                Karar: {result.decision}
              </div>
              <div className="text-sm font-medium opacity-90">{result.reasoning}</div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-gray-700 border-b border-gray-100 pb-2">Kullanılan Sinyaller (CAMARA)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm">
                  <div className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wider">SIM Swap Check</div>
                  <pre className="font-mono text-xs bg-gray-100 p-2 rounded overflow-x-auto text-gray-800">
                    {JSON.stringify(result.signals.sim_swap, null, 2)}
                  </pre>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wider">Number Verification</div>
                    <pre className="font-mono text-xs bg-gray-100 p-2 rounded overflow-x-auto text-gray-800">
                      {JSON.stringify(result.signals.number_verification, null, 2)}
                    </pre>
                  </div>
                  {result.signals.number_verification?.status === "pending" && (
                    <a 
                      href={`http://localhost:8000/auth/number-verification/start?phone_number=${encodeURIComponent(result.phone_number)}`} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="mt-4 inline-flex items-center justify-center px-4 py-2 border border-blue-300 shadow-sm text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      OAuth Doğrulamasını Başlat ↗
                    </a>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
