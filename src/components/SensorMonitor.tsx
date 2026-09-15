import React, { useState } from 'react';
import {
  BillboardLocation,
  SensorThresholdConfig,
  AlertNotification,
} from '../types';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';
import {
  Activity,
  Zap,
  Sun,
  Wind,
  Navigation,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Download,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  ArrowUpDown,
  Building,
  Wrench,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from 'lucide-react';
import { exportBillboardsToCsv } from '../services/googleDriveService';
import { useToast } from './Toast';

interface SensorMonitorProps {
  billboards: BillboardLocation[];
  thresholds: SensorThresholdConfig;
  onSelectBillboard: (b: BillboardLocation) => void;
  onTriggerSpike?: (
    type: 'wind' | 'lux' | 'power' | 'traffic',
    billboardCode: string
  ) => void;
  onResetSensors: () => void;
  onOpenSyncModal: () => void;
  onRunAiForBillboard: (b: BillboardLocation) => void;
}

export const SensorMonitor: React.FC<SensorMonitorProps> = ({
  billboards,
  thresholds,
  onSelectBillboard,
  onTriggerSpike,
  onResetSensors,
  onOpenSyncModal,
  onRunAiForBillboard,
}) => {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Normal' | 'Warning' | 'Critical' | 'Vacant'>('ALL');
  const [sortField, setSortField] = useState<'traffic' | 'lux' | 'power' | 'name'>('traffic');
  const [sortAsc, setSortAsc] = useState(false);
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false);

  // Compute KPI metrics
  const totalBillboards = billboards.length;
  const activeBillboards = billboards.filter((b) => b.status !== 'Vacant').length;
  const normalCount = billboards.filter((b) => b.status === 'Normal').length;
  const warningCount = billboards.filter((b) => b.status === 'Warning').length;
  const criticalCount = billboards.filter((b) => b.status === 'Critical').length;
  const vacantCount = billboards.filter((b) => b.status === 'Vacant').length;
  const avgTraffic = Math.round(
    billboards.reduce((acc, b) => acc + b.metrics.trafficVolume, 0) / (totalBillboards || 1)
  );
  const totalPowerKw = Number(
    billboards.reduce((acc, b) => acc + b.metrics.powerKw, 0).toFixed(2)
  );

  // Prepare chart data
  const trafficChartData = billboards.slice(0, 8).map((b) => ({
    name: b.code.replace('BDO-', ''),
    fullName: b.name,
    kendaraan: b.metrics.trafficVolume,
    pejalanKaki: b.metrics.pedestrianFlow,
  }));

  const powerLuxChartData = billboards.map((b) => ({
    name: b.code.replace('BDO-', ''),
    lux: b.metrics.ambientLux,
    dayaKw: b.metrics.powerKw,
    arus: b.metrics.powerCurrent,
  }));

  // Filtering & Sorting
  const filteredBillboards = billboards
    .filter((b) => {
      const matchSearch =
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        b.code.toLowerCase().includes(search.toLowerCase()) ||
        b.address.toLowerCase().includes(search.toLowerCase()) ||
        (b.currentClient && b.currentClient.toLowerCase().includes(search.toLowerCase()));
      const matchCat = selectedCategory === 'ALL' || b.type === selectedCategory;
      const matchStatus = statusFilter === 'ALL' || b.status === statusFilter;
      return matchSearch && matchCat && matchStatus;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortField === 'traffic') {
        comparison = a.metrics.trafficVolume - b.metrics.trafficVolume;
      } else if (sortField === 'lux') {
        comparison = a.metrics.ambientLux - b.metrics.ambientLux;
      } else if (sortField === 'power') {
        comparison = a.metrics.powerKw - b.metrics.powerKw;
      } else {
        comparison = a.name.localeCompare(b.name);
      }
      return sortAsc ? comparison : -comparison;
    });

  const handleDownloadCsv = () => {
    try {
      const csv = exportBillboardsToCsv(billboards);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `billboard_measurements_bandung_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Unduh Berhasil', 'success', 'File CSV telemetri billboard berhasil diekspor.');
    } catch {
      showToast('Gagal Mengunduh', 'error', 'Tidak dapat mengekspor file CSV saat ini.');
    }
  };

  const handleResetWithToast = () => {
    onResetSensors();
    showToast('Status Dinormalisasi', 'success', 'Seluruh sensor dipulihkan ke nilai normal tanpa status error.');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* KPI Top Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Total Titik Billboard</span>
            <Building className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-white font-mono">{totalBillboards}</div>
          <div className="text-[11px] text-emerald-400 mt-1">
            {activeBillboards} Tersewa / Aktif
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Rata-Rata Lalu Lintas</span>
            <Navigation className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {avgTraffic.toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Kendaraan / jam / titik</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Total Konsumsi Daya</span>
            <Zap className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {totalPowerKw}
            <span className="text-sm font-normal text-slate-400"> kW</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Semua unit videotron & LED</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Status Ambang Batas</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-white font-mono flex items-baseline gap-2">
            <span className="text-rose-400">{criticalCount}</span>
            <span className="text-xs text-slate-400">Kritis</span>
            <span className="text-amber-400">{warningCount}</span>
            <span className="text-xs text-slate-400">Waspada</span>
          </div>
          <div className="text-[11px] text-rose-400/90 mt-1">Notifikasi otomatis aktif</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Sinkronisasi Google Drive</span>
            <RefreshCw className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-base font-bold text-emerald-300 font-mono truncate">
            Tersambung
          </div>
          <div className="text-[11px] text-slate-400 mt-1 truncate">
            suherman.reklame2012
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="text-xs text-slate-400">Aksi Cepat Database</div>
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handleDownloadCsv}
              className="w-full py-1.5 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1 transition-all"
              title="Ekspor database telemetri ke CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh CSV</span>
            </button>
            <button
              onClick={onOpenSyncModal}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700"
              title="Sinkronkan ke Google Drive"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Operational Control Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Pusat Pemantauan Operasional Telemetri Sensor</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Live Stream
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Data sensor IoT di seluruh titik billboard Bandung dipantau otomatis setiap 3 detik.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleResetWithToast}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/50 transition-colors flex items-center gap-1.5 shadow-sm"
              title="Kembalikan semua status sensor ke Normal dan bersihkan alarm aktif"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Normalisasi Status Sensor</span>
            </button>

            <button
              onClick={handleDownloadCsv}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Ekspor CSV</span>
            </button>

            <button
              onClick={() => setIsDiagnosticOpen(!isDiagnosticOpen)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800/80 hover:bg-slate-700/80 text-slate-400 hover:text-slate-200 border border-slate-700/60 transition-colors flex items-center gap-1.5"
              title="Buka alat diagnostik teknisi pemeliharaan lapangan"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Diagnostik Teknis</span>
              {isDiagnosticOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Collapsible Technician Diagnostics (Hidden by default to remove debug clutter) */}
        {isDiagnosticOpen && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 bg-slate-950/50 rounded-xl p-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>Pengujian Diagnostik Khusus Pemeliharaan Lapangan</span>
              </span>
              <span className="text-[11px] text-slate-500">
                Picu kondisi uji coba untuk memverifikasi kesiapan respon teknisi
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {onTriggerSpike && (
                <>
                  <button
                    onClick={() => {
                      onTriggerSpike('wind', 'BDO-PASP-02');
                      showToast('Uji Getaran Angin Dikirim', 'warning', 'Simulasi sensor badai angin diaktifkan di Pasupati.');
                    }}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-rose-950/50 hover:bg-rose-900 text-rose-300 border border-rose-800/50 transition-colors flex items-center gap-1"
                  >
                    <Wind className="w-3 h-3" />
                    <span>Tes Angin (Pasupati)</span>
                  </button>

                  <button
                    onClick={() => {
                      onTriggerSpike('lux', 'BDO-ASAF-03');
                      showToast('Uji Lampu Padam Dikirim', 'warning', 'Simulasi sensor lux redup diaktifkan di Asia Afrika.');
                    }}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-amber-950/50 hover:bg-amber-900 text-amber-300 border border-amber-800/50 transition-colors flex items-center gap-1"
                  >
                    <Sun className="w-3 h-3" />
                    <span>Tes Lux Redup (Asia Afrika)</span>
                  </button>

                  <button
                    onClick={() => {
                      onTriggerSpike('power', 'BDO-SKHT-08');
                      showToast('Uji Arus Lebih Dikirim', 'warning', 'Simulasi lonjakan arus diaktifkan di Soekarno Hatta.');
                    }}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-yellow-950/50 hover:bg-yellow-900 text-yellow-300 border border-yellow-800/50 transition-colors flex items-center gap-1"
                  >
                    <Zap className="w-3 h-3" />
                    <span>Tes Arus Listrik (Soekarno-Hatta)</span>
                  </button>
                </>
              )}
              <button
                onClick={handleResetWithToast}
                className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 transition-colors flex items-center gap-1 ml-auto"
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Selesaikan & Pulihkan Normal</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Visual Sensor Analytics Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic Density & Pedestrian Footfall Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Navigation className="w-4 h-4 text-cyan-400" />
                <span>Volume Lalu Lintas & Pejalan Kaki per Titik</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Pengukuran sensor radar & kamera AI di koridor utama Bandung (kendaraan/jam)
              </p>
            </div>
            <span className="text-[10px] text-slate-500 font-mono bg-slate-800 px-2 py-1 rounded">
              Unit: /jam
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trafficChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="kendaraan" fill="#38bdf8" name="Kendaraan Motor & Mobil" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pejalanKaki" fill="#f59e0b" name="Pejalan Kaki" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lux Illumination vs Power Draw Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-400" />
                <span>Pencahayaan Lux vs Konsumsi Daya Listrik (kW)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Korelasi efisiensi watt LED terhadap intensitas lux pencahayaan billboard
              </p>
            </div>
            <span className="text-[10px] text-slate-500 font-mono bg-slate-800 px-2 py-1 rounded">
              Lux & kW
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={powerLuxChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLux" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorKw" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="lux" stroke="#f59e0b" fillOpacity={1} fill="url(#colorLux)" name="Sensor Lux" />
                <Area type="monotone" dataKey="dayaKw" stroke="#10b981" fillOpacity={1} fill="url(#colorKw)" name="Daya (kW)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Database Table Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {/* Table Header Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-amber-500" />
              <span>Database Pengukuran Lokasi & Sensor Billboard</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Sinkron otomatis dengan folder Google Drive CSV • Terakhir update: realtime
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Quick Status Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  statusFilter === 'ALL'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Semua ({totalBillboards})
              </button>
              <button
                onClick={() => setStatusFilter('Normal')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  statusFilter === 'Normal'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                    : 'text-emerald-400 hover:text-emerald-300'
                }`}
              >
                Normal ({normalCount})
              </button>
              {warningCount > 0 && (
                <button
                  onClick={() => setStatusFilter('Warning')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    statusFilter === 'Warning'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                      : 'text-amber-400 hover:text-amber-300'
                  }`}
                >
                  Waspada ({warningCount})
                </button>
              )}
              {criticalCount > 0 && (
                <button
                  onClick={() => setStatusFilter('Critical')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    statusFilter === 'Critical'
                      ? 'bg-rose-500 text-slate-950 font-bold shadow-sm'
                      : 'text-rose-400 hover:text-rose-300'
                  }`}
                >
                  Kritis ({criticalCount})
                </button>
              )}
              {vacantCount > 0 && (
                <button
                  onClick={() => setStatusFilter('Vacant')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    statusFilter === 'Vacant'
                      ? 'bg-slate-700 text-white font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  Kosong ({vacantCount})
                </button>
              )}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari titik / kode / klien..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 focus:outline-none focus:border-amber-500 w-36 sm:w-48"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
                >
                  ×
                </button>
              )}
            </div>

            {/* Filter category */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 focus:outline-none"
            >
              <option value="ALL">Semua Tipe</option>
              <option value="LED Megatron">LED Megatron</option>
              <option value="Digital Videotron">Digital Videotron</option>
              <option value="Static Frontlite">Static Frontlite</option>
              <option value="Bando Jalan">Bando Jalan</option>
              <option value="Prisma Display">Prisma Display</option>
            </select>

            {/* Sort toggle */}
            <button
              onClick={() => {
                setSortAsc(!sortAsc);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1 hover:bg-slate-700"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>{sortAsc ? 'Menaik' : 'Menurun'}</span>
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-semibold">
              <tr>
                <th className="py-3 px-4">Kode & Lokasi</th>
                <th className="py-3 px-3">Tipe & Dimensi</th>
                <th className="py-3 px-3">Lalu Lintas</th>
                <th className="py-3 px-3">Lux Sensor</th>
                <th className="py-3 px-3">Daya (kW / A)</th>
                <th className="py-3 px-3">Getaran & Angin</th>
                <th className="py-3 px-3">Klien Penyewa</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredBillboards.map((b) => {
                const isLuxLow = b.metrics.ambientLux < thresholds.minLuxNight;
                const isCurrentHigh = b.metrics.powerCurrent > thresholds.maxPowerCurrent;
                const isVibHigh = b.metrics.structuralVibration > thresholds.maxVibration;
                const isWindHigh = b.metrics.windSpeed > thresholds.maxWindSpeed;

                return (
                  <tr
                    key={b.id}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                    onClick={() => onSelectBillboard(b)}
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-white font-mono text-[11px]">{b.code}</div>
                      <div className="font-medium text-slate-200 truncate max-w-[200px]">{b.name}</div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[220px]">{b.address}</div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-200">{b.type}</div>
                      <div className="text-[10px] text-slate-400">{b.dimensions}</div>
                    </td>

                    <td className="py-3 px-3 font-mono">
                      <div className="font-bold text-cyan-400">
                        {b.metrics.trafficVolume.toLocaleString('id-ID')}
                      </div>
                      <div className="text-[10px] text-slate-500">{b.metrics.pedestrianFlow} orang</div>
                    </td>

                    <td className="py-3 px-3 font-mono">
                      <div className={`font-bold ${isLuxLow ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`}>
                        {b.metrics.ambientLux} Lux
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {isLuxLow ? '⚠️ Redup' : 'Optimal'}
                      </div>
                    </td>

                    <td className="py-3 px-3 font-mono">
                      <div className="font-bold text-slate-200">{b.metrics.powerKw} kW</div>
                      <div className={`text-[10px] ${isCurrentHigh ? 'text-rose-400 font-bold' : 'text-slate-400'}`}>
                        {b.metrics.powerCurrent}A • {b.metrics.powerVoltage}V
                      </div>
                    </td>

                    <td className="py-3 px-3 font-mono">
                      <div className={`font-semibold ${isVibHigh ? 'text-rose-400 font-bold' : 'text-slate-300'}`}>
                        {b.metrics.structuralVibration} mm/s
                      </div>
                      <div className={`text-[10px] ${isWindHigh ? 'text-rose-400 font-bold' : 'text-slate-400'}`}>
                        {b.metrics.windSpeed} km/h
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-200 max-w-[140px] truncate">
                        {b.currentClient || <span className="text-slate-500 italic">Belum Disewa</span>}
                      </div>
                      {b.contractExpiry && (
                        <div className="text-[10px] text-slate-500">s/d {b.contractExpiry}</div>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          b.status === 'Critical'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                            : b.status === 'Warning'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                            : b.status === 'Vacant'
                            ? 'bg-slate-700/60 text-slate-400'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {b.currentClient && (
                          <button
                            onClick={() => onRunAiForBillboard(b)}
                            className="p-1.5 rounded-lg bg-purple-950/60 hover:bg-purple-900 text-purple-300 border border-purple-700/50"
                            title="Jalankan Analisis AI Prediktif Klien"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => onSelectBillboard(b)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-[11px]"
                        >
                          Detail
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
