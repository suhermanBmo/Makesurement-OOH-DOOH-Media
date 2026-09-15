import React, { useState } from 'react';
import {
  CRMClient,
  BillboardLocation,
  AIPredictiveReport,
} from '../types';
import {
  Sparkles,
  TrendingUp,
  Users,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Building,
  ArrowRight,
  RefreshCw,
  Copy,
  Check,
  Zap,
  Target,
  FileText,
  Mail,
  Phone,
  BarChart3,
} from 'lucide-react';

interface CrmPredictiveModalProps {
  clients: CRMClient[];
  billboards: BillboardLocation[];
  selectedClientId?: string;
  onSelectClient?: (client: CRMClient) => void;
}

export const CrmPredictiveModal: React.FC<CrmPredictiveModalProps> = ({
  clients,
  billboards,
  selectedClientId,
  onSelectClient,
}) => {
  const [activeClient, setActiveClient] = useState<CRMClient>(
    clients.find((c) => c.id === selectedClientId) || clients[0]
  );
  const [isLoadingAi, setIsLoadingAi] = useState<boolean>(false);
  const [report, setReport] = useState<AIPredictiveReport | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Billboards rented by this client
  const clientBillboards = billboards.filter((b) =>
    activeClient.activeBillboards.includes(b.code)
  );

  // Call Server Gemini Predictive Endpoint
  const handleRunPredictiveAi = async () => {
    setIsLoadingAi(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/ai/crm-predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientData: activeClient,
          billboards: clientBillboards,
          timeRange: 'Kuartal Q4 2026',
        }),
      });

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const data = await res.json();
      setReport({
        churnRiskScore: data.churnRiskScore ?? 25,
        renewalProbability: data.renewalProbability ?? 85,
        sentimentAnalysis: data.sentimentAnalysis || 'Stabil dan berpeluang ekspansi.',
        insights: data.insights || [],
        recommendedActions: data.recommendedActions || [],
        predictedLifetimeValue: data.predictedLifetimeValue || 'Rp 500.000.000',
        nextPeriodRetentionProbability: data.nextPeriodRetentionProbability || '85%',
        generatedAt: new Date().toLocaleTimeString('id-ID'),
        source: data.source || 'gemini-3.8-flash',
      });
    } catch (err: any) {
      console.error('Failed to run AI prediction:', err);
      setErrorMsg('Gagal memproses analisis AI: ' + (err?.message || 'Koneksi terputus'));
    } finally {
      setIsLoadingAi(false);
    }
  };

  const handleCopyReport = () => {
    if (!report) return;
    const text = `LAPORAN ANALISIS PREDIKTIF AI CRM - ${activeClient.companyName}
Brand: ${activeClient.brand}
Titik Billboard: ${activeClient.activeBillboards.join(', ')}
Probabilitas Perpanjangan Kontrak: ${report.renewalProbability}%
Skor Risiko Churn: ${report.churnRiskScore}%
Proyeksi LTV: ${report.predictedLifetimeValue}

Analisis Perilaku:
${report.sentimentAnalysis}

Insight Prediktif:
${report.insights.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}

Rekomendasi Tindakan:
${report.recommendedActions.map((a, idx) => `${idx + 1}. ${a}`).join('\n')}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Hero Strip */}
      <div className="bg-gradient-to-r from-purple-950/60 via-slate-900 to-slate-900 border border-purple-800/40 rounded-3xl p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-600/30">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">
                  Automatisasi AI CRM & Analisis Prediktif Perilaku Pelanggan
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Gemini 3.8 Flash Engine
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                Secara berkala memprediksi probabilitas perpanjangan sewa, risiko churn, efektivitas tayang sensor, serta rekomendasi up-sell koridor billboard di Bandung.
              </p>
            </div>
          </div>

          <button
            onClick={handleRunPredictiveAi}
            disabled={isLoadingAi}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-600/20 transition-all active:scale-95 disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 ${isLoadingAi ? 'animate-spin' : ''}`} />
            <span>{isLoadingAi ? 'Memproses Prediksi AI...' : 'Jalankan Analisis Prediktif AI'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Client Selector vs Predictive Intelligence */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Client List (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              <span>Daftar Klien Pengiklan ({clients.length})</span>
            </h3>
            <span className="text-xs text-slate-500">Pilih klien</span>
          </div>

          <div className="space-y-2.5">
            {clients.map((c) => {
              const isSelected = activeClient.id === c.id;
              const isHighRisk = c.churnRisk >= 50;

              return (
                <div
                  key={c.id}
                  onClick={() => {
                    setActiveClient(c);
                    setReport(null);
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800 border-purple-500/80 shadow-lg shadow-purple-500/10'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-xs text-white leading-tight">{c.companyName}</h4>
                      <p className="text-[11px] text-purple-400 font-medium">{c.brand}</p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isHighRisk
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {isHighRisk ? 'RISIKO TINGGI' : 'RETENSI BAIK'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-slate-800 text-[11px] text-slate-400">
                    <div>
                      <span>Sewa Bulanan:</span>
                      <div className="font-semibold text-slate-200 font-mono">
                        Rp {(c.monthlySpend / 1000000).toFixed(0)} Jt
                      </div>
                    </div>
                    <div>
                      <span>Titik Billboard:</span>
                      <div className="font-semibold text-slate-200 font-mono">
                        {c.activeBillboards.join(', ')}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: AI Insights & Client Detail (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Active Client Profile Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-purple-400 font-bold">
                  {activeClient.industry}
                </span>
                <h3 className="text-lg font-bold text-white">{activeClient.companyName}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Kampanye Aktif: <b className="text-slate-200">{activeClient.brand}</b>
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 block">Jatuh Tempo Kontrak</span>
                <span className="text-sm font-bold text-amber-400 font-mono flex items-center gap-1 justify-end">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{activeClient.contractEnd}</span>
                </span>
              </div>
            </div>

            {/* Client Key Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[11px] block">Total Belanja LTV</span>
                <span className="text-sm font-bold text-white font-mono">
                  Rp {(activeClient.totalLifetimeValue / 1000000).toFixed(0)} Jt
                </span>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[11px] block">Kepuasan Klien</span>
                <span className="text-sm font-bold text-amber-400 font-mono">
                  ★ {activeClient.satisfactionScore} / 5.0
                </span>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[11px] block">Estimasi Impresi</span>
                <span className="text-sm font-bold text-cyan-400 font-mono">
                  {(activeClient.historicalCampaignImpressions / 1000000).toFixed(1)} Jt Tayang
                </span>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[11px] block">Probabilitas Renewal</span>
                <span className="text-sm font-bold text-emerald-400 font-mono">
                  {100 - activeClient.churnRisk}%
                </span>
              </div>
            </div>

            {/* Billboard Points Rented by this client */}
            <div className="p-3.5 bg-slate-800/40 rounded-2xl border border-slate-800">
              <h4 className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-amber-400" />
                <span>Titik Pengukuran Billboard Terpasang:</span>
              </h4>
              <div className="space-y-2">
                {clientBillboards.map((b) => (
                  <div
                    key={b.id}
                    className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs"
                  >
                    <div>
                      <span className="font-mono font-bold text-amber-400 mr-2">{b.code}</span>
                      <span className="font-semibold text-white">{b.name}</span>
                      <span className="text-slate-500 block text-[10px]">{b.address}</span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] font-mono">
                      <span>Lalu Lintas: <b className="text-cyan-400">{b.metrics.trafficVolume}</b>/jam</span>
                      <span>Lux: <b className="text-amber-400">{b.metrics.ambientLux}</b></span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          b.status === 'Critical'
                            ? 'bg-rose-500/20 text-rose-400'
                            : b.status === 'Warning'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-emerald-500/20 text-emerald-400'
                        }`}
                      >
                        {b.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AI Predictive Intelligence Section */}
          <div className="bg-slate-900 border border-purple-900/50 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Hasil Analisis Prediktif AI (Gemini 3.8 Flash)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Korelasi performa telemetri sensor terhadap keputusan perpanjangan sewa
                  </p>
                </div>
              </div>

              {report && (
                <button
                  onClick={handleCopyReport}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Tersalin' : 'Salin Laporan'}</span>
                </button>
              )}
            </div>

            {report ? (
              <div className="space-y-5">
                {/* Meter Cards: Renewal vs Churn */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/50">
                    <span className="text-xs text-emerald-300 block">Probabilitas Perpanjangan</span>
                    <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
                      {report.renewalProbability}%
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
                      <div
                        className="bg-emerald-400 h-full rounded-full transition-all duration-700"
                        style={{ width: `${report.renewalProbability}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/50">
                    <span className="text-xs text-rose-300 block">Skor Risiko Churn</span>
                    <div className="text-2xl font-black text-rose-400 font-mono mt-1">
                      {report.churnRiskScore}%
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
                      <div
                        className="bg-rose-400 h-full rounded-full transition-all duration-700"
                        style={{ width: `${report.churnRiskScore}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-800/50">
                    <span className="text-xs text-purple-300 block">Proyeksi LTV Berikutnya</span>
                    <div className="text-xl font-black text-purple-300 font-mono mt-1 truncate">
                      {report.predictedLifetimeValue}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-2 block">
                      Retensi: {report.nextPeriodRetentionProbability}
                    </span>
                  </div>
                </div>

                {/* Sentiment & Behavioral Analysis */}
                <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-800">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-purple-400" />
                    <span>Evaluasi Perilaku & Kepuasan Klien</span>
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {report.sentimentAnalysis}
                  </p>
                </div>

                {/* Insights List */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Insight Prediktif Sensor & Kampanye
                  </h4>
                  <div className="space-y-2">
                    {report.insights.map((insight, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-850 border border-slate-800 text-xs text-slate-200 flex items-start gap-2.5"
                      >
                        <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span>{insight}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommended Actions */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Tindakan Rekomendasi Tim Sales & Account Manager
                  </h4>
                  <div className="space-y-2">
                    {report.recommendedActions.map((action, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-800/40 text-xs text-indigo-200 flex items-start gap-2.5"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{action}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 flex items-center justify-between pt-2 border-t border-slate-800">
                  <span>Dihasilkan pada: {report.generatedAt}</span>
                  <span>Engine: {report.source}</span>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-800/30 rounded-2xl text-slate-400 text-xs space-y-3">
                <Sparkles className="w-10 h-10 text-purple-400/60 mx-auto" />
                <div>
                  <p className="font-semibold text-slate-300 text-sm">
                    Belum Ada Laporan Prediktif untuk Klien Ini
                  </p>
                  <p className="text-slate-500 mt-1 max-w-md mx-auto">
                    Klik tombol di atas untuk menganalisis data telemetri sensor billboard yang disewa,
                    korelasi impresi lalu lintas, dan histori belanja iklan klien menggunakan Gemini 3.8 Flash.
                  </p>
                </div>
                <button
                  onClick={handleRunPredictiveAi}
                  disabled={isLoadingAi}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs inline-flex items-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Jalankan Prediksi Sekarang</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
