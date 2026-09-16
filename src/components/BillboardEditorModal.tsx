import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Save,
  MapPin,
  Building,
  Activity,
  Zap,
  Sun,
  Wind,
  Vibrate,
  Navigation,
  DollarSign,
  Calendar,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import {
  BillboardLocation,
  BillboardType,
  BillboardStatus,
  SensorMetrics,
} from '../types';

interface BillboardEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (billboard: BillboardLocation, isNew: boolean) => void;
  billboardToEdit: BillboardLocation | null;
  existingCodes: string[];
}

const BANDUNG_PRESETS = [
  { name: 'Simpang Dago', lat: -6.8854, lng: 107.6138, address: 'Jl. Ir. H. Juanda (Dago), Coblong, Bandung' },
  { name: 'Asia Afrika Alun-Alun', lat: -6.9218, lng: 107.6074, address: 'Jl. Asia Afrika No. 88, Sumur Bandung' },
  { name: 'Pasteur Gerbang Tol', lat: -6.8942, lng: 107.5791, address: 'Jl. Dr. Djunjunan (Pasteur) Km 2.5, Bandung' },
  { name: 'Flyover Pasupati', lat: -6.9004, lng: 107.6082, address: 'Jembatan Layang Pasupati - Cihampelas, Bandung' },
  { name: 'R.E. Martadinata (Riau)', lat: -6.9082, lng: 107.6214, address: 'Jl. L.L.R.E. Martadinata No. 112, Bandung' },
  { name: 'Gatot Subroto TSM', lat: -6.9275, lng: 107.6364, address: 'Jl. Gatot Subroto No. 289, Batununggal, Bandung' },
  { name: 'Buah Batu Interchange', lat: -6.9458, lng: 107.6322, address: 'Jl. Buah Batu Raya No. 210, Bandung' },
  { name: 'Supratman Pusdai', lat: -6.9035, lng: 107.6288, address: 'Jl. Supratman No. 45, Cibeunying Kaler, Bandung' },
];

export const BillboardEditorModal: React.FC<BillboardEditorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  billboardToEdit,
  existingCodes,
}) => {
  const isNew = !billboardToEdit;

  // Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Bandung');
  const [type, setType] = useState<BillboardType>('LED Megatron');
  const [roadCategory, setRoadCategory] = useState<BillboardLocation['roadCategory']>('Protokol Utama');
  const [dimensions, setDimensions] = useState('8m x 16m');
  const [orientation, setOrientation] = useState('Facing South (2 Arah Pandang)');
  const [lat, setLat] = useState(-6.9035);
  const [lng, setLng] = useState(107.6186);

  // Commercial
  const [baseRateMonthly, setBaseRateMonthly] = useState(120000000);
  const [currentClient, setCurrentClient] = useState('');
  const [contractExpiry, setContractExpiry] = useState('');
  const [status, setStatus] = useState<BillboardStatus>('Normal');
  const [dailyImpressions, setDailyImpressions] = useState(95000);

  // Telemetry Baseline
  const [trafficVolume, setTrafficVolume] = useState(6200);
  const [pedestrianFlow, setPedestrianFlow] = useState(1100);
  const [ambientLux, setAmbientLux] = useState(2400);
  const [powerVoltage, setPowerVoltage] = useState(220.5);
  const [powerCurrent, setPowerCurrent] = useState(14.2);
  const [structuralVibration, setStructuralVibration] = useState(0.68);
  const [windSpeed, setWindSpeed] = useState(14.5);

  const [activeTab, setActiveTab] = useState<'info' | 'commercial' | 'telemetry'>('info');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Populate when modal opens
  useEffect(() => {
    if (billboardToEdit) {
      setCode(billboardToEdit.code);
      setName(billboardToEdit.name);
      setAddress(billboardToEdit.address);
      setCity(billboardToEdit.city || 'Bandung');
      setType(billboardToEdit.type);
      setRoadCategory(billboardToEdit.roadCategory);
      setDimensions(billboardToEdit.dimensions);
      setOrientation(billboardToEdit.orientation);
      setLat(billboardToEdit.coordinates.lat);
      setLng(billboardToEdit.coordinates.lng);

      setBaseRateMonthly(billboardToEdit.baseRateMonthly);
      setCurrentClient(billboardToEdit.currentClient || '');
      setContractExpiry(billboardToEdit.contractExpiry || '');
      setStatus(billboardToEdit.status);
      setDailyImpressions(billboardToEdit.dailyImpressionsEstimate || 95000);

      setTrafficVolume(billboardToEdit.metrics.trafficVolume);
      setPedestrianFlow(billboardToEdit.metrics.pedestrianFlow);
      setAmbientLux(billboardToEdit.metrics.ambientLux);
      setPowerVoltage(billboardToEdit.metrics.powerVoltage);
      setPowerCurrent(billboardToEdit.metrics.powerCurrent);
      setStructuralVibration(billboardToEdit.metrics.structuralVibration);
      setWindSpeed(billboardToEdit.metrics.windSpeed);
    } else {
      // Auto generate next code
      const nextNum = existingCodes.length + 1;
      const formattedNum = nextNum < 10 ? `0${nextNum}` : `${nextNum}`;
      setCode(`BDO-BDG-${formattedNum}`);
      setName('');
      setAddress('');
      setCity('Bandung');
      setType('LED Megatron');
      setRoadCategory('Protokol Utama');
      setDimensions('8m x 16m');
      setOrientation('Facing South (2 Arah Pandang)');
      setLat(-6.9035);
      setLng(107.6186);

      setBaseRateMonthly(125000000);
      setCurrentClient('');
      setContractExpiry('');
      setStatus('Normal');
      setDailyImpressions(110000);

      setTrafficVolume(6500);
      setPedestrianFlow(1250);
      setAmbientLux(2600);
      setPowerVoltage(220.5);
      setPowerCurrent(14.0);
      setStructuralVibration(0.7);
      setWindSpeed(14.0);
    }
    setErrorMsg(null);
    setActiveTab('info');
  }, [billboardToEdit, isOpen, existingCodes]);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: typeof BANDUNG_PRESETS[0]) => {
    setLat(preset.lat);
    setLng(preset.lng);
    if (!address) setAddress(preset.address);
    if (!name) setName(`Billboard ${preset.name}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedCode = code.trim().toUpperCase();
    const trimmedName = name.trim();
    const trimmedAddress = address.trim();

    if (!trimmedCode) {
      setErrorMsg('Kode Billboard wajib diisi (misal: BDO-DAGO-02)');
      setActiveTab('info');
      return;
    }

    // Check duplicate code if new or changed
    if (isNew && existingCodes.includes(trimmedCode)) {
      setErrorMsg(`Kode Billboard "${trimmedCode}" sudah terdaftar. Gunakan kode unik lain.`);
      setActiveTab('info');
      return;
    }

    if (!trimmedName) {
      setErrorMsg('Nama Billboard wajib diisi');
      setActiveTab('info');
      return;
    }

    if (!trimmedAddress) {
      setErrorMsg('Alamat lokasi wajib diisi');
      setActiveTab('info');
      return;
    }

    if (isNaN(lat) || isNaN(lng) || lat < -11 || lat > 6 || lng < 95 || lng > 141) {
      setErrorMsg('Koordinat Latitude & Longitude tidak valid untuk wilayah Indonesia');
      setActiveTab('info');
      return;
    }

    const calculatedKw = Number(((powerVoltage * powerCurrent * 0.85) / 1000).toFixed(2));

    const metrics: SensorMetrics = {
      trafficVolume: Number(trafficVolume) || 5000,
      pedestrianFlow: Number(pedestrianFlow) || 1000,
      ambientLux: Number(ambientLux) || 2000,
      powerVoltage: Number(powerVoltage) || 220,
      powerCurrent: Number(powerCurrent) || 12,
      powerKw: calculatedKw,
      temperature: 26.5,
      humidity: 75,
      structuralVibration: Number(structuralVibration) || 0.7,
      windSpeed: Number(windSpeed) || 15,
      displayActive: status !== 'Vacant',
      lastUpdated: new Date().toISOString(),
    };

    const billboardData: BillboardLocation = {
      id: billboardToEdit?.id || `bb-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      code: trimmedCode,
      name: trimmedName,
      address: trimmedAddress,
      city: city || 'Bandung',
      coordinates: {
        lat: Number(lat),
        lng: Number(lng),
      },
      type,
      dimensions: dimensions.trim() || '8m x 16m',
      orientation: orientation.trim() || 'Facing Traffic',
      roadCategory,
      baseRateMonthly: Number(baseRateMonthly) || 50000000,
      currentClient: currentClient.trim() || null,
      contractExpiry: contractExpiry.trim() || null,
      status,
      metrics,
      lastCsvSync: new Date().toISOString().slice(0, 10),
      dailyImpressionsEstimate: Number(dailyImpressions) || 80000,
      availStatus: currentClient.trim() ? 'Terisi' : 'Avail Sekarang',
    };

    onSave(billboardData, isNew);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isNew ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'}`}>
              {isNew ? <Plus className="w-5 h-5" /> : <Save className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  {isNew ? 'Tambah Titik Billboard Baru' : `Edit Data Billboard: ${billboardToEdit?.code}`}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isNew ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
                  {isNew ? 'Entri Baru' : 'Perbarui Database'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Pengaturan parameter lokasi, tipe display, sewa komersial & sensor telemetri
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

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 pb-2 border-b border-slate-800/80 bg-slate-950/40 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`px-3.5 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'info'
                ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>1. Lokasi & Fisik</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('commercial')}
            className={`px-3.5 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'commercial'
                ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>2. Komersial & Status</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('telemetry')}
            className={`px-3.5 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'telemetry'
                ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>3. Baseline Sensor IoT</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: Lokasi & Fisik */}
          {activeTab === 'info' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Kode Billboard <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="misal: BDO-DAGO-02"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:border-amber-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500">Gunakan format prefix unik BDO-...</span>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Tipe Konstruksi Display <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as BillboardType)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-amber-500 focus:outline-none"
                  >
                    <option value="LED Megatron">LED Megatron (Outdoor Besar)</option>
                    <option value="Digital Videotron">Digital Videotron (Resolusi Tinggi)</option>
                    <option value="Static Frontlite">Static Frontlite (Lampu Sorot)</option>
                    <option value="Bando Jalan">Bando Jalan (Melintang Jalan)</option>
                    <option value="Prisma Display">Prisma Display (3 Tampilan)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Nama Titik Reklame <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="misal: Simpang Dago Heritage Megatron"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-medium mb-1">
                    Alamat Lengkap Lokasi <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="misal: Jl. Ir. H. Juanda No. 120, Bandung"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Kota</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Dimensi Display</label>
                  <input
                    type="text"
                    placeholder="misal: 8m x 16m"
                    value={dimensions}
                    onChange={(e) => setDimensions(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Kategori Jalan</label>
                  <select
                    value={roadCategory}
                    onChange={(e) => setRoadCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-amber-500 focus:outline-none"
                  >
                    <option value="Protokol Utama">Protokol Utama</option>
                    <option value="Arteri Primer">Arteri Primer</option>
                    <option value="Kolektor">Kolektor</option>
                    <option value="Jalan Tol">Jalan Tol</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Orientasi Pandang</label>
                  <input
                    type="text"
                    placeholder="misal: Facing South (Dago Bawah)"
                    value={orientation}
                    onChange={(e) => setOrientation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Coordinates & Bandung Presets */}
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Koordinat Titik Peta Leaflet / OpenStreetMap</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Pusat Bandung: -6.9175, 107.6191</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Latitude (Garis Lintang)</label>
                    <input
                      type="number"
                      step="0.000001"
                      required
                      value={lat}
                      onChange={(e) => setLat(parseFloat(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-cyan-300 font-mono focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Longitude (Garis Bujur)</label>
                    <input
                      type="number"
                      step="0.000001"
                      required
                      value={lng}
                      onChange={(e) => setLng(parseFloat(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-cyan-300 font-mono focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-slate-400 mb-1.5 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>Pilih Preset Lokasi Strategis Bandung Cepat:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {BANDUNG_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => handleApplyPreset(preset)}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] transition-colors border border-slate-700/60"
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Komersial & Status */}
          {activeTab === 'commercial' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Tarif Sewa Bulanan (IDR / Bulan) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="1000000"
                    required
                    value={baseRateMonthly}
                    onChange={(e) => setBaseRateMonthly(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-amber-300 font-mono font-bold focus:border-amber-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 font-mono">
                    Rp {Number(baseRateMonthly).toLocaleString('id-ID')} / bulan
                  </span>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Status Operasional</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as BillboardStatus)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-amber-500 focus:outline-none"
                  >
                    <option value="Normal">Normal (Aktif & Sehat)</option>
                    <option value="Vacant">Vacant (Kosong / Siap Sewa)</option>
                    <option value="Warning">Warning (Waspada Sensor)</option>
                    <option value="Critical">Critical (Perlu Penanganan)</option>
                    <option value="Maintenance">Maintenance (Dalam Perbaikan)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Klien Penyewa Saat Ini (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Kosongkan jika status Vacant / Belum Disewa"
                    value={currentClient}
                    onChange={(e) => setCurrentClient(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Tanggal Berakhir Kontrak
                  </label>
                  <input
                    type="date"
                    value={contractExpiry}
                    onChange={(e) => setContractExpiry(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Estimasi Impresi Harian (Mata Pengunjung / Hari)
                </label>
                <input
                  type="number"
                  step="1000"
                  value={dailyImpressions}
                  onChange={(e) => setDailyImpressions(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:border-amber-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500">
                  {Number(dailyImpressions).toLocaleString('id-ID')} impresi mata per hari
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: Baseline Sensor IoT */}
          {activeTab === 'telemetry' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-400 text-[11px]">
                Parameter berikut adalah nilai baseline telemetri IoT titik ini. Nilai akan otomatis bergerak dinamis dalam interval streaming 3 detik dan dipantau oleh AI Auto-Healer.
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Lalu Lintas (Kendaraan/jam)</label>
                  <input
                    type="number"
                    value={trafficVolume}
                    onChange={(e) => setTrafficVolume(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-cyan-400 font-mono focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Pejalan Kaki (Orang/jam)</label>
                  <input
                    type="number"
                    value={pedestrianFlow}
                    onChange={(e) => setPedestrianFlow(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Sensor Lux Pencahayaan</label>
                  <input
                    type="number"
                    value={ambientLux}
                    onChange={(e) => setAmbientLux(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-amber-400 font-mono focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Tegangan Listrik (Volt)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={powerVoltage}
                    onChange={(e) => setPowerVoltage(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Arus Beban Listrik (Ampere)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={powerCurrent}
                    onChange={(e) => setPowerCurrent(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Getaran Tiang (mm/s)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={structuralVibration}
                    onChange={(e) => setStructuralVibration(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Kecepatan Angin (km/h)</label>
                <input
                  type="number"
                  step="0.1"
                  value={windSpeed}
                  onChange={(e) => setWindSpeed(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:border-amber-500 focus:outline-none max-w-xs"
                />
              </div>
            </div>
          )}

          {/* Footer Controls inside form */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
            >
              Batal
            </button>

            <div className="flex items-center gap-2">
              {activeTab !== 'info' && (
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === 'telemetry' ? 'commercial' : 'info')}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Kembali
                </button>
              )}

              {activeTab !== 'telemetry' ? (
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === 'info' ? 'commercial' : 'telemetry')}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-colors"
                >
                  Lanjut →
                </button>
              ) : (
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl font-bold flex items-center gap-1.5 text-white shadow-lg transition-all ${
                    isNew
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30'
                      : 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/30'
                  }`}
                >
                  <Save className="w-4 h-4" />
                  <span>{isNew ? 'Simpan Titik Baru ke Database' : 'Simpan Perubahan'}</span>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
