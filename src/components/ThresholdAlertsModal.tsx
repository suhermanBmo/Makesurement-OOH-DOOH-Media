import React, { useState } from 'react';
import {
  SensorThresholdConfig,
  AlertNotification,
} from '../types';
import {
  Sliders,
  Bell,
  AlertTriangle,
  CheckCircle2,
  Mail,
  Send,
  Trash2,
  X,
  ShieldAlert,
  Sun,
  Zap,
  Vibrate,
  Wind,
  Navigation,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { useToast } from './Toast';

interface ThresholdAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  thresholds: SensorThresholdConfig;
  onUpdateThresholds: (newConfig: SensorThresholdConfig) => void;
  alerts: AlertNotification[];
  onAcknowledgeAlert: (alertId: string) => void;
  onClearAcknowledged: () => void;
  onSendTestNotification: () => void;
}

export const ThresholdAlertsModal: React.FC<ThresholdAlertsModalProps> = ({
  isOpen,
  onClose,
  thresholds,
  onUpdateThresholds,
  alerts,
  onAcknowledgeAlert,
  onClearAcknowledged,
  onSendTestNotification,
}) => {
  const { showToast } = useToast();
  const [localThresholds, setLocalThresholds] = useState<SensorThresholdConfig>(thresholds);
  const [isSaved, setIsSaved] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<'ALL' | 'critical' | 'warning'>('ALL');

  if (!isOpen) return null;

  const handleSave = () => {
    onUpdateThresholds(localThresholds);
    setIsSaved(true);
    showToast('Konfigurasi Disimpan', 'success', 'Ambang batas sensor berhasil diperbarui ke Cloud Firestore.');
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleApplyPreset = (preset: 'standard' | 'sensitive') => {
    if (preset === 'standard') {
      const standard: SensorThresholdConfig = {
        ...localThresholds,
        minLuxNight: 120,
        maxPowerCurrent: 24,
        minVoltage: 195,
        maxVibration: 2.5,
        maxWindSpeed: 38,
        minTrafficCongestionDrop: 40,
      };
      setLocalThresholds(standard);
      showToast('Preset Standar Diterapkan', 'info', 'Nilai parameter disesuaikan dengan standar Dinas Tata Ruang & Reklame Bandung.');
    } else {
      const sensitive: SensorThresholdConfig = {
        ...localThresholds,
        minLuxNight: 150,
        maxPowerCurrent: 20,
        minVoltage: 205,
        maxVibration: 1.8,
        maxWindSpeed: 30,
        minTrafficCongestionDrop: 30,
      };
      setLocalThresholds(sensitive);
      showToast('Preset Sensitivitas Tinggi Diterapkan', 'info', 'Peringatan dini akan dipicu lebih awal.');
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    if (filterSeverity === 'ALL') return true;
    return a.severity === filterSeverity;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col my-8">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                Konfigurasi Ambang Batas & Sistem Notifikasi Otomatis
              </h2>
              <p className="text-xs text-slate-400">
                Peringatan dini saat sensor mencapai ambang batas batas bahaya / malfungsi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(85vh-140px)]">
          {/* Target Email Dispatch Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-800 to-indigo-950/30 border border-slate-700 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Email Penerima Notifikasi Otomatis:</span>
                <span className="text-sm font-bold text-white font-mono">
                  {localThresholds.notificationEmail}
                </span>
              </div>
            </div>

            <button
              onClick={onSendTestNotification}
              className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center gap-2 shadow transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Kirim Uji Coba Peringatan Sekarang</span>
            </button>
          </div>

          {/* Threshold Sliders & Settings */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider text-[11px] text-slate-400">
                Batas Parameter Ambang Batas Sensor
              </h3>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 text-[11px]">Preset Cepat:</span>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('standard')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] border border-slate-700 transition"
                >
                  Standar Normal
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('sensitive')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] border border-slate-700 transition"
                >
                  Sensitivitas Tinggi
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Lux Night Minimum */}
              <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <Sun className="w-4 h-4 text-amber-400" />
                    <span>Ambang Batas Minimum Lux (Malam)</span>
                  </span>
                  <span className="font-mono font-bold text-amber-400">
                    {localThresholds.minLuxNight} Lux
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="500"
                  step="10"
                  value={localThresholds.minLuxNight}
                  onChange={(e) =>
                    setLocalThresholds({
                      ...localThresholds,
                      minLuxNight: Number(e.target.value),
                    })
                  }
                  className="w-full accent-amber-400 cursor-pointer"
                />
                <p className="text-[11px] text-slate-500">
                  Memicu peringatan jika pencahayaan lampu sorot / modul LED malam hari turun di bawah nilai ini.
                </p>
              </div>

              {/* Power Current Overload */}
              <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <span>Batas Maksimum Arus Listrik (Overload)</span>
                  </span>
                  <span className="font-mono font-bold text-yellow-400">
                    {localThresholds.maxPowerCurrent} A
                  </span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="35"
                  step="0.5"
                  value={localThresholds.maxPowerCurrent}
                  onChange={(e) =>
                    setLocalThresholds({
                      ...localThresholds,
                      maxPowerCurrent: Number(e.target.value),
                    })
                  }
                  className="w-full accent-yellow-400 cursor-pointer"
                />
                <p className="text-[11px] text-slate-500">
                  Mencegah korsleting & lonjakan arus trafo pada panel distribusi LED billboard.
                </p>
              </div>

              {/* Structural Vibration Limit */}
              <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <Vibrate className="w-4 h-4 text-indigo-400" />
                    <span>Batas Getaran Struktur Maksimum</span>
                  </span>
                  <span className="font-mono font-bold text-indigo-400">
                    {localThresholds.maxVibration} mm/s
                  </span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="5.0"
                  step="0.1"
                  value={localThresholds.maxVibration}
                  onChange={(e) =>
                    setLocalThresholds({
                      ...localThresholds,
                      maxVibration: Number(e.target.value),
                    })
                  }
                  className="w-full accent-indigo-400 cursor-pointer"
                />
                <p className="text-[11px] text-slate-500">
                  Deteksi kelelahan material tiang reklame monopole & goncangan akibat beban berlebih.
                </p>
              </div>

              {/* Max Wind Speed */}
              <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <Wind className="w-4 h-4 text-rose-400" />
                    <span>Ambang Batas Kecepatan Angin (Badai)</span>
                  </span>
                  <span className="font-mono font-bold text-rose-400">
                    {localThresholds.maxWindSpeed} km/h
                  </span>
                </div>
                <input
                  type="range"
                  min="25"
                  max="70"
                  step="1"
                  value={localThresholds.maxWindSpeed}
                  onChange={(e) =>
                    setLocalThresholds({
                      ...localThresholds,
                      maxWindSpeed: Number(e.target.value),
                    })
                  }
                  className="w-full accent-rose-400 cursor-pointer"
                />
                <p className="text-[11px] text-slate-500">
                  Mengaktifkan siaga keselamatan angin kencang di kawasan flyover Pasupati dan jembatan terbuka.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              {isSaved ? (
                <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Ambang batas berhasil disimpan & aktif.</span>
                </span>
              ) : (
                <span className="text-xs text-slate-500">Perubahan ambang batas berlaku secara instan.</span>
              )}

              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow transition-colors"
              >
                Simpan Konfigurasi Ambang Batas
              </button>
            </div>
          </div>

          {/* Live Notification Log History */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Bell className="w-4 h-4 text-rose-400" />
                  <span>Log Riwayat Peringatan Ambang Batas Terkirim</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Daftar insiden sensor yang otomatis dilaporkan ke suherman.reklame2012@gmail.com
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={filterSeverity}
                  onChange={(e: any) => setFilterSeverity(e.target.value)}
                  className="bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700 text-xs"
                >
                  <option value="ALL">Semua Tingkat</option>
                  <option value="critical">🔴 Kritis (Critical)</option>
                  <option value="warning">🟡 Peringatan (Warning)</option>
                </select>

                <button
                  onClick={onClearAcknowledged}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 flex items-center gap-1"
                  title="Hapus notifikasi yang sudah diakui"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Bersihkan</span>
                </button>
              </div>
            </div>

            <div className="space-y-2.5">
              {filteredAlerts.length > 0 ? (
                filteredAlerts.map((alt) => (
                  <div
                    key={alt.id}
                    className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 transition-colors ${
                      alt.severity === 'critical'
                        ? 'bg-rose-950/40 border-rose-800/60'
                        : 'bg-amber-950/30 border-amber-800/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-lg mt-0.5 ${
                          alt.severity === 'critical'
                            ? 'bg-rose-500/20 text-rose-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        <ShieldAlert className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-white">{alt.title}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            {alt.billboardName}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                          {alt.message}
                        </p>
                        <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1.5">
                          <span>Waktu: {new Date(alt.timestamp).toLocaleString('id-ID')}</span>
                          <span>•</span>
                          <span>
                            Terkirim ke:{' '}
                            <span className="text-cyan-400 font-mono">{alt.dispatchedToEmail}</span>
                          </span>
                          <span>•</span>
                          <span className="text-emerald-400 font-medium">Status: {alt.dispatchedStatus}</span>
                        </div>
                      </div>
                    </div>

                    {!alt.acknowledged ? (
                      <button
                        onClick={() => onAcknowledgeAlert(alt.id)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs shrink-0 border border-slate-700"
                      >
                        Tandai Selesai
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-500 shrink-0 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Diakui</span>
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-8 text-center bg-slate-800/30 rounded-2xl text-slate-500 text-xs">
                  Tidak ada peringatan aktif untuk kriteria filter ini.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
