import React from 'react';
import {
  BillboardLocation,
  SensorThresholdConfig,
} from '../types';
import {
  X,
  MapPin,
  Building,
  Activity,
  Zap,
  Sun,
  Wind,
  Vibrate,
  Navigation,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  Send,
  Pencil,
  Trash2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface BillboardDetailModalProps {
  billboard: BillboardLocation | null;
  onClose: () => void;
  thresholds: SensorThresholdConfig;
  onRunAiForBillboard?: (b: BillboardLocation) => void;
  onOpenProposalForBillboard?: (b: BillboardLocation) => void;
  onEditBillboard?: (b: BillboardLocation) => void;
  onDeleteBillboard?: (b: BillboardLocation) => void;
}

export const BillboardDetailModal: React.FC<BillboardDetailModalProps> = ({
  billboard,
  onClose,
  thresholds,
  onRunAiForBillboard,
  onOpenProposalForBillboard,
  onEditBillboard,
  onDeleteBillboard,
}) => {
  if (!billboard) return null;

  // Generate 24-hour simulation trend based on current metrics
  const hourlyData = [
    { hour: '00:00', lux: 80, traffic: Math.round(billboard.metrics.trafficVolume * 0.15), vibration: 0.6 },
    { hour: '04:00', lux: 70, traffic: Math.round(billboard.metrics.trafficVolume * 0.1), vibration: 0.5 },
    { hour: '07:00', lux: 1400, traffic: Math.round(billboard.metrics.trafficVolume * 0.85), vibration: 1.2 },
    { hour: '10:00', lux: 3600, traffic: Math.round(billboard.metrics.trafficVolume * 0.95), vibration: 1.1 },
    { hour: '13:00', lux: 4200, traffic: Math.round(billboard.metrics.trafficVolume * 0.8), vibration: 1.0 },
    { hour: '17:00', lux: 2800, traffic: Math.round(billboard.metrics.trafficVolume * 1.1), vibration: 1.8 },
    { hour: '19:00', lux: billboard.metrics.ambientLux, traffic: billboard.metrics.trafficVolume, vibration: billboard.metrics.structuralVibration },
    { hour: '22:00', lux: Math.round(billboard.metrics.ambientLux * 0.9), traffic: Math.round(billboard.metrics.trafficVolume * 0.45), vibration: 0.8 },
  ];

  const isLuxLow = billboard.metrics.ambientLux < thresholds.minLuxNight;
  const isCurrentHigh = billboard.metrics.powerCurrent > thresholds.maxPowerCurrent;
  const isVibHigh = billboard.metrics.structuralVibration > thresholds.maxVibration;
  const isWindHigh = billboard.metrics.windSpeed > thresholds.maxWindSpeed;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col my-8">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between bg-slate-900/80">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {billboard.code}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  billboard.status === 'Critical'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : billboard.status === 'Warning'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : billboard.status === 'Vacant'
                    ? 'bg-slate-700 text-slate-300'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {billboard.status.toUpperCase()}
              </span>
            </div>
            <h2 className="text-lg font-bold text-white leading-tight">{billboard.name}</h2>
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              <span>{billboard.address}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(85vh-140px)]">
          {/* Construction Specs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Tipe Display</span>
              <span className="text-xs font-bold text-slate-200">{billboard.type}</span>
            </div>
            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Ukuran / Dimensi</span>
              <span className="text-xs font-bold text-slate-200">{billboard.dimensions}</span>
            </div>
            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Klasifikasi Jalan</span>
              <span className="text-xs font-bold text-slate-200">{billboard.roadCategory}</span>
            </div>
            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Tarif Referensi</span>
              <span className="text-xs font-bold text-amber-400 font-mono">
                Rp {(billboard.baseRateMonthly / 1000000).toFixed(0)} Jt /bln
              </span>
            </div>
          </div>

          {/* Real-time Telemetry Metrics */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Status Sensor Telemetri Real-Time</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Traffic */}
              <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/60">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>Lalu Lintas</span>
                  <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <div className="text-lg font-bold text-cyan-400 font-mono">
                  {billboard.metrics.trafficVolume.toLocaleString('id-ID')}
                </div>
                <span className="text-[10px] text-slate-400">kendaraan / jam</span>
              </div>

              {/* Lux */}
              <div
                className={`p-3.5 rounded-2xl border ${
                  isLuxLow
                    ? 'bg-rose-950/40 border-rose-600/60'
                    : 'bg-slate-800/80 border-slate-700/60'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>Sensor Lux</span>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className={`text-lg font-bold font-mono ${isLuxLow ? 'text-rose-400' : 'text-amber-400'}`}>
                  {billboard.metrics.ambientLux} Lux
                </div>
                <span className="text-[10px] text-slate-400">
                  {isLuxLow ? '⚠️ Dibawah Ambang Batas' : 'Pencahayaan Baik'}
                </span>
              </div>

              {/* Power */}
              <div
                className={`p-3.5 rounded-2xl border ${
                  isCurrentHigh
                    ? 'bg-rose-950/40 border-rose-600/60'
                    : 'bg-slate-800/80 border-slate-700/60'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>Daya & Arus</span>
                  <Zap className="w-3.5 h-3.5 text-yellow-400" />
                </div>
                <div className="text-lg font-bold text-yellow-400 font-mono">
                  {billboard.metrics.powerKw} kW
                </div>
                <span className="text-[10px] text-slate-400">
                  {billboard.metrics.powerVoltage}V • {billboard.metrics.powerCurrent}A
                </span>
              </div>

              {/* Structural & Wind */}
              <div
                className={`p-3.5 rounded-2xl border ${
                  isVibHigh || isWindHigh
                    ? 'bg-rose-950/40 border-rose-600/60'
                    : 'bg-slate-800/80 border-slate-700/60'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>Getaran Tiang</span>
                  <Vibrate className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <div className={`text-lg font-bold font-mono ${isVibHigh ? 'text-rose-400' : 'text-indigo-400'}`}>
                  {billboard.metrics.structuralVibration} mm/s
                </div>
                <span className="text-[10px] text-slate-400">
                  Angin: {billboard.metrics.windSpeed} km/h
                </span>
              </div>
            </div>
          </div>

          {/* 24-Hour Trend Chart */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Tren 24 Jam: Lalu Lintas & Intensitas Lux Sensor
            </h3>
            <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-800 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="hour" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '0.5rem',
                      fontSize: '11px',
                    }}
                  />
                  <Area type="monotone" dataKey="traffic" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.2} name="Lalu Lintas (/jam)" />
                  <Area type="monotone" dataKey="lux" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} name="Lux" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tenant & Lease Card */}
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-slate-400 text-xs block">Penyewa & Kontrak Berjalan:</span>
              <div className="text-sm font-bold text-white mt-0.5">
                {billboard.currentClient || <span className="text-amber-400">Lokasi Kosong (Tersedia)</span>}
              </div>
              {billboard.contractExpiry && (
                <span className="text-xs text-slate-400">
                  Berlaku hingga: <b className="text-slate-200">{billboard.contractExpiry}</b>
                </span>
              )}
            </div>

            {onRunAiForBillboard && billboard.currentClient && (
              <button
                onClick={() => {
                  onClose();
                  onRunAiForBillboard(billboard);
                }}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Analisis AI Klien Ini</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {onOpenProposalForBillboard && (
              <button
                onClick={() => {
                  onClose();
                  onOpenProposalForBillboard(billboard);
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Buat Penawaran Titik Ini</span>
              </button>
            )}

            {onEditBillboard && (
              <button
                onClick={() => {
                  onClose();
                  onEditBillboard(billboard);
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
                title="Edit Data Lokasi & Parameter Billboard"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit Titik</span>
              </button>
            )}

            {onDeleteBillboard && (
              <button
                onClick={() => {
                  onClose();
                  onDeleteBillboard(billboard);
                }}
                className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
                title="Hapus Titik Billboard dari Database"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus</span>
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
