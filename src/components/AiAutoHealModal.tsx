import React, { useState } from 'react';
import {
  ShieldCheck,
  Zap,
  Activity,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  MapPin,
  X,
  Sliders,
  Check,
  Cpu,
  Lock,
} from 'lucide-react';
import { BillboardLocation, SensorThresholdConfig, AlertNotification } from '../types';
import { AiAutoFixReport } from '../services/aiAutoHealerService';

interface AiAutoHealModalProps {
  isOpen: boolean;
  onClose: () => void;
  billboards: BillboardLocation[];
  alerts: AlertNotification[];
  thresholds: SensorThresholdConfig;
  autoHealEnabled: boolean;
  setAutoHealEnabled: (enabled: boolean) => void;
  onTriggerAiFix: () => void;
  latestReport: AiAutoFixReport | null;
}

export const AiAutoHealModal: React.FC<AiAutoHealModalProps> = ({
  isOpen,
  onClose,
  billboards,
  alerts,
  autoHealEnabled,
  setAutoHealEnabled,
  onTriggerAiFix,
  latestReport,
}) => {
  const [isScanning, setIsScanning] = useState(false);

  if (!isOpen) return null;

  const handleManualScanAndFix = () => {
    setIsScanning(true);
    setTimeout(() => {
      onTriggerAiFix();
      setIsScanning(false);
    }, 600);
  };

  const normalCount = billboards.filter((b) => b.status === 'Normal').length;
  const criticalCount = billboards.filter((b) => b.status === 'Critical').length;
  const warningCount = billboards.filter((b) => b.status === 'Warning').length;
  const unreadAlerts = alerts.filter((a) => !a.acknowledged && a.severity === 'critical').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-emerald-500/30 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Cpu className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  AI Auto-Healer & Debug Engine
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {criticalCount === 0 && unreadAlerts === 0 ? 'Zero Error • Optimal' : 'Perlu Stabilisasi'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Sistem perbaikan mandiri otomatis untuk sensor, peta, dan telemetri Bandung Media Outdoor
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
          {/* Status Matrix Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5">
              <div className="text-[11px] text-slate-400 mb-1 flex items-center justify-between">
                <span>Skor Kesehatan</span>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-xl font-bold font-mono text-emerald-400">
                {criticalCount === 0 ? '100%' : '88%'}
              </div>
              <div className="text-[10px] text-emerald-400/90 mt-0.5">Sistem Sehat</div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5">
              <div className="text-[11px] text-slate-400 mb-1 flex items-center justify-between">
                <span>Engine Peta</span>
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="text-sm font-bold font-mono text-cyan-300">
                OpenStreetMap
              </div>
              <div className="text-[10px] text-cyan-400/90 mt-0.5">Bebas Watermark & Key</div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5">
              <div className="text-[11px] text-slate-400 mb-1 flex items-center justify-between">
                <span>Sensor Normal</span>
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-xl font-bold font-mono text-emerald-400">
                {normalCount} / {billboards.length}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Titik Reklame</div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5">
              <div className="text-[11px] text-slate-400 mb-1 flex items-center justify-between">
                <span>Error Kritis Aktif</span>
                <Zap className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <div className={`text-xl font-bold font-mono ${criticalCount === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {criticalCount}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {criticalCount === 0 ? '0 Error Terdeteksi' : 'Perlu Auto-Fix'}
              </div>
            </div>
          </div>

          {/* Auto-Heal Live Toggle Banner */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-xl mt-0.5 ${autoHealEnabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'}`}>
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white flex items-center gap-2">
                  <span>Proteksi Auto-Heal Real-Time Otomatis</span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${autoHealEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                    {autoHealEnabled ? 'AKTIF' : 'NON-AKTIF'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  AI terus memantau telemetri setiap detik. Jika terjadi lonjakan getaran, drop tegangan, atau arus tinggi, AI akan seketika menstabilkan parameter ke batas aman secara otomatis.
                </p>
              </div>
            </div>

            <button
              onClick={() => setAutoHealEnabled(!autoHealEnabled)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                autoHealEnabled
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              {autoHealEnabled ? 'Nonaktifkan' : 'Aktifkan'}
            </button>
          </div>

          {/* Action Trigger Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleManualScanAndFix}
              disabled={isScanning}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-900/30 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Menjalankan Diagnostik & Perbaikan AI...' : 'Jalankan AI Auto-Fix & Bersihkan Semua Error Sekarang'}</span>
            </button>
          </div>

          {/* Remediation Audit Logs */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Log Remediasi & Diagnostik Sistem AI</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                {latestReport ? new Date(latestReport.timestamp).toLocaleTimeString() : 'Sistem Siap'}
              </span>
            </div>

            {latestReport && latestReport.fixedItems.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {latestReport.fixedItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-900/90 border border-emerald-500/20 text-[11px] space-y-1"
                  >
                    <div className="flex items-center justify-between text-slate-200 font-medium">
                      <span className="text-emerald-300 font-mono font-bold">{item.billboardCode}</span>
                      <span className="text-slate-400">{item.billboardName}</span>
                    </div>
                    {item.remediations.map((rem, rIdx) => (
                      <div key={rIdx} className="flex items-start gap-1.5 text-emerald-400/90 text-[10px]">
                        <Check className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{rem}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center text-slate-400 space-y-1">
                <ShieldCheck className="w-8 h-8 text-emerald-400/70 mx-auto" />
                <p className="font-medium text-slate-200">Seluruh Parameter Sistem Dalam Batas Ideal</p>
                <p className="text-[11px] text-slate-500">
                  Tidak ada error kritis, getaran berlebih, atau anomali kelistrikan yang aktif.
                </p>
              </div>
            )}
          </div>

          {/* Map & Security Information */}
          <div className="p-3.5 rounded-2xl bg-slate-950/40 border border-slate-800/80 text-[11px] space-y-1.5 text-slate-400">
            <div className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Jaminan Bebas API Key & Tanpa Watermark</span>
            </div>
            <p>
              Peta interaktif Leaflet kini telah dialihkan secara permanen ke OpenStreetMap Standard & Esri ArcGIS Online publik. Ubin peta tidak lagi menggunakan endpoint Carto yang meminta API key berbayar, sehingga bebas dari tulisan watermark "API KEY REQUIRED".
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-950 px-6 py-3 border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            Bandung Media Outdoor AI Sentinel
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
