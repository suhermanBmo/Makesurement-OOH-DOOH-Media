import React, { useState } from 'react';
import {
  GoogleDriveSyncState,
  BillboardLocation,
  CRMClient,
} from '../types';
import {
  FolderSync,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  FileSpreadsheet,
  Presentation,
  Flame,
  ShieldCheck,
  X,
  FileUp,
  Database,
  Check,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  TARGET_FOLDER_ID,
  TARGET_DRIVE_EMAIL,
  listFolderFiles,
  downloadDriveFileText,
  uploadCsvToDrive,
  parseBillboardCsv,
  exportBillboardsToCsv,
} from '../services/googleDriveService';
import { exportBillboardsToGoogleSheet, importBillboardsFromGoogleSheet } from '../services/googleSheetsService';
import { createBillboardSlideDeck } from '../services/googleSlidesService';
import { batchSaveBillboardsToFirestore, testFirestoreConnection } from '../services/firestoreService';
import { googleSignIn } from '../services/firebaseAuth';

interface WorkspaceHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  driveSync: GoogleDriveSyncState;
  setDriveSync: React.Dispatch<React.SetStateAction<GoogleDriveSyncState>>;
  billboards: BillboardLocation[];
  clients: CRMClient[];
  onUpdateBillboards: (newBillboards: BillboardLocation[]) => void;
  onAddAlert: (title: string, message: string, severity: 'info' | 'warning' | 'critical') => void;
}

export const WorkspaceHubModal: React.FC<WorkspaceHubModalProps> = ({
  isOpen,
  onClose,
  driveSync,
  setDriveSync,
  billboards,
  clients,
  onUpdateBillboards,
  onAddAlert,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'sheets' | 'slides' | 'drive' | 'firebase'>('sheets');

  // Loading & Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Sheets state
  const [createdSheetUrl, setCreatedSheetUrl] = useState<string | null>(null);
  const [importSheetId, setImportSheetId] = useState<string>('');

  // Slides state
  const [createdSlideUrl, setCreatedSlideUrl] = useState<string | null>(null);

  // Firestore status
  const [firestoreStatus, setFirestoreStatus] = useState<'connected' | 'checking' | 'idle'>('connected');

  if (!isOpen) return null;

  // Google OAuth connect
  const handleConnectGoogle = async () => {
    try {
      setIsLoading(true);
      const result = await googleSignIn();
      if (result) {
        setDriveSync((prev) => ({
          ...prev,
          connected: true,
          userEmail: result.user.email,
          accessToken: result.accessToken,
          syncStatus: 'success',
          syncMessage: `Terhubung dengan Google: ${result.user.email}`,
        }));
        setFeedback({
          type: 'success',
          message: `Berhasil terhubung ke akun Google (${result.user.email}) dengan akses Drive, Sheets, dan Slides.`,
        });
      }
    } catch (err: any) {
      console.error('Connect Google error:', err);
      setFeedback({
        type: 'error',
        message: 'Gagal menghubungkan Google: ' + (err?.message || 'Akses ditolak'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Google Sheets: Export Billboards
  const handleExportToSheet = async () => {
    if (!driveSync.accessToken) {
      setFeedback({
        type: 'info',
        message: 'Silakan hubungkan akun Google terlebih dahulu untuk membuat Google Sheet.',
      });
      return;
    }

    try {
      setIsLoading(true);
      setFeedback(null);
      const res = await exportBillboardsToGoogleSheet(driveSync.accessToken, billboards);
      setCreatedSheetUrl(res.spreadsheetUrl);
      setFeedback({
        type: 'success',
        message: `Google Sheet berhasil dibuat: "${res.title}" dengan ${res.rowCount} baris telemetri sensor!`,
      });
      onAddAlert(
        'Google Sheet Berhasil Diekspor',
        `Spreadsheet "${res.title}" telah dibuat di Google Drive ${driveSync.userEmail}.`,
        'info'
      );
    } catch (err: any) {
      console.error('Export sheet error:', err);
      setFeedback({
        type: 'error',
        message: 'Gagal membuat Google Sheet: ' + (err.message || String(err)),
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Google Sheets: Import Billboards
  const handleImportFromSheet = async () => {
    if (!driveSync.accessToken) {
      setFeedback({
        type: 'info',
        message: 'Silakan hubungkan akun Google terlebih dahulu.',
      });
      return;
    }

    if (!importSheetId.trim()) {
      setFeedback({
        type: 'error',
        message: 'Masukkan Spreadsheet ID atau URL Google Sheet yang valid.',
      });
      return;
    }

    try {
      setIsLoading(true);
      setFeedback(null);
      // Clean ID if full URL pasted
      let sheetId = importSheetId.trim();
      const match = sheetId.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        sheetId = match[1];
      }

      const imported = await importBillboardsFromGoogleSheet(driveSync.accessToken, sheetId);
      if (imported.length > 0) {
        onUpdateBillboards(imported);
        // Also persist to Firestore
        await batchSaveBillboardsToFirestore(imported);
        setFeedback({
          type: 'success',
          message: `Berhasil mengimpor ${imported.length} titik billboard dari Google Sheet dan disinkronkan ke Firestore!`,
        });
      }
    } catch (err: any) {
      console.error('Import sheet error:', err);
      setFeedback({
        type: 'error',
        message: 'Gagal membaca Google Sheet: ' + (err.message || String(err)),
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Google Slides: Generate Presentation
  const handleGenerateSlides = async () => {
    if (!driveSync.accessToken) {
      setFeedback({
        type: 'info',
        message: 'Silakan hubungkan akun Google terlebih dahulu untuk membuat Google Slides.',
      });
      return;
    }

    try {
      setIsLoading(true);
      setFeedback(null);
      const res = await createBillboardSlideDeck(driveSync.accessToken, billboards, clients);
      setCreatedSlideUrl(res.presentationUrl);
      setFeedback({
        type: 'success',
        message: `Presentasi Google Slides berhasil dibuat (${res.slidesCount} slide eksekutif)!`,
      });
      onAddAlert(
        'Google Slides Presentation Terbit',
        `Presentasi audit sensor dan laporan billboard dibuat untuk ${driveSync.userEmail}.`,
        'info'
      );
    } catch (err: any) {
      console.error('Generate slides error:', err);
      setFeedback({
        type: 'error',
        message: 'Gagal membuat Google Slides: ' + (err.message || String(err)),
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Google Drive: Fetch files
  const handleFetchDriveFiles = async () => {
    if (!driveSync.accessToken) return;
    try {
      setIsLoading(true);
      const files = await listFolderFiles(driveSync.accessToken, driveSync.folderId);
      setDriveSync((prev) => ({
        ...prev,
        remoteFiles: files,
        lastSyncTime: new Date().toLocaleTimeString('id-ID'),
      }));
      setFeedback({
        type: 'success',
        message: `Ditemukan ${files.length} file di folder Google Drive.`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: 'Gagal membaca folder Google Drive: ' + (err.message || String(err)),
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Firestore: Check connection
  const handleCheckFirestore = async () => {
    setFirestoreStatus('checking');
    const ok = await testFirestoreConnection();
    setFirestoreStatus(ok ? 'connected' : 'idle');
    setFeedback({
      type: ok ? 'success' : 'info',
      message: ok
        ? 'Koneksi database Cloud Firestore aktif dan tersinkronisasi real-time.'
        : 'Status Firestore dalam mode lokal / offline.',
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-cyan-300">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                Google Workspace & Cloud Sync Hub
              </h3>
              <p className="text-xs text-slate-400">
                Integrasi Google Sheets, Slides, Drive & Cloud Firestore
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Account Authentication Bar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Akun Google:</span>
            {driveSync.connected && driveSync.userEmail ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                {driveSync.userEmail}
              </span>
            ) : (
              <span className="text-slate-500 italic">Belum terhubung</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!driveSync.connected ? (
              <button
                onClick={handleConnectGoogle}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 py-1.5 rounded-lg shadow-sm transition disabled:opacity-50"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Otentikasi Akun Google</span>
              </button>
            ) : (
              <span className="text-emerald-700 font-medium flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>Drive, Sheets & Slides Siap Digunakan</span>
              </span>
            )}
          </div>
        </div>

        {/* Feedback Alert if any */}
        {feedback && (
          <div
            className={`mx-6 mt-3 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : feedback.type === 'error'
                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                : 'bg-blue-50 text-blue-800 border border-blue-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-slate-600 font-bold ml-2"
            >
              ×
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="px-6 pt-3 border-b border-slate-200 flex space-x-4">
          <button
            onClick={() => setActiveSubTab('sheets')}
            className={`pb-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
              activeSubTab === 'sheets'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Google Sheets</span>
          </button>

          <button
            onClick={() => setActiveSubTab('slides')}
            className={`pb-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
              activeSubTab === 'slides'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Presentation className="w-4 h-4 text-amber-500" />
            <span>Google Slides</span>
          </button>

          <button
            onClick={() => setActiveSubTab('drive')}
            className={`pb-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
              activeSubTab === 'drive'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FolderSync className="w-4 h-4 text-blue-600" />
            <span>Google Drive (CSV)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('firebase')}
            className={`pb-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
              activeSubTab === 'firebase'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Flame className="w-4 h-4 text-orange-500" />
            <span>Cloud Firestore</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* TAB 1: GOOGLE SHEETS */}
          {activeSubTab === 'sheets' && (
            <div className="space-y-4">
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-sm text-emerald-950 flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <span>Sinkronisasi Spreadsheet Pengukuran Billboard</span>
                    </h4>
                    <p className="text-xs text-emerald-800/80 mt-1">
                      Ekspor database telemetri lengkap ({billboards.length} titik) langsung ke Google Sheet dengan 26 kolom sensor real-time, atau impor perubahan kembali ke dashboard.
                    </p>
                  </div>
                  <button
                    onClick={handleExportToSheet}
                    disabled={isLoading || !driveSync.accessToken}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2 rounded-lg shadow transition flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Ekspor ke Sheet Baru</span>
                  </button>
                </div>

                {createdSheetUrl && (
                  <div className="mt-3 pt-3 border-t border-emerald-200/60 flex items-center justify-between">
                    <span className="text-xs font-medium text-emerald-900">
                      Spreadsheet Aktif:
                    </span>
                    <a
                      href={createdSheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-900 underline"
                    >
                      <span>Buka Google Sheet di Tab Baru</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>

              {/* Import from existing sheet */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                <h5 className="font-semibold text-xs text-slate-800">
                  Impor Data dari Spreadsheet Yang Sudah Ada
                </h5>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Tempel Spreadsheet ID atau Link URL Google Sheet..."
                    value={importSheetId}
                    onChange={(e) => setImportSheetId(e.target.value)}
                    className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={handleImportFromSheet}
                    disabled={isLoading || !driveSync.accessToken}
                    className="bg-slate-800 hover:bg-slate-900 text-white font-medium text-xs px-4 py-1.5 rounded-lg transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Impor & Timpa</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Format sheet yang didukung memiliki header standar seperti: Kode Titik, Nama Billboard, Alamat, Koordinat, Tipe, Status, dan parameter sensor.
                </p>
              </div>

              {/* Preview columns included */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <h5 className="font-semibold text-xs text-slate-700 mb-2">
                  26 Kolom Sensor yang Disinkronkan:
                </h5>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Kode Titik',
                    'Nama Billboard',
                    'Alamat',
                    'Kota',
                    'Koordinat Lat/Lng',
                    'Tipe Konstruksi',
                    'Dimensi',
                    'Arah Hadap',
                    'Kategori Jalan',
                    'Tarif Bulanan',
                    'Klien Aktif',
                    'Status',
                    'Volume Lalu Lintas',
                    'Pejalan Kaki',
                    'Lux Sensor',
                    'Tegangan Volt',
                    'Arus Ampere',
                    'Daya kW',
                    'Suhu °C',
                    'Kelembapan %',
                    'Getaran mm/s',
                    'Kecepatan Angin',
                    'Waktu Update',
                  ].map((col) => (
                    <span
                      key={col}
                      className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] text-slate-600 font-mono"
                    >
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GOOGLE SLIDES */}
          {activeSubTab === 'slides' && (
            <div className="space-y-4">
              <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-sm text-amber-950 flex items-center gap-2">
                      <Presentation className="w-4 h-4 text-amber-600" />
                      <span>Generator Presentasi Eksekutif Google Slides</span>
                    </h4>
                    <p className="text-xs text-amber-900/80 mt-1">
                      Otomatisasi pembuatan dek presentasi resmi Bandung Media Outdoor untuk laporan klien dan evaluasi mingguan sensor reklame.
                    </p>
                  </div>
                  <button
                    onClick={handleGenerateSlides}
                    disabled={isLoading || !driveSync.accessToken}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs px-4 py-2 rounded-lg shadow transition flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Buat Slide Otomatis</span>
                  </button>
                </div>

                {createdSlideUrl && (
                  <div className="mt-3 pt-3 border-t border-amber-200/60 flex items-center justify-between">
                    <span className="text-xs font-medium text-amber-900">
                      Slide Presentasi Telah Dibuat:
                    </span>
                    <a
                      href={createdSlideUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-900 underline"
                    >
                      <span>Buka Google Slides di Tab Baru</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>

              {/* Slide Structure breakdown */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                <h5 className="font-semibold text-xs text-slate-800">
                  Struktur Slide yang Dihasilkan:
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="font-bold text-slate-800 block">Slide 1: Ringkasan KPI</span>
                    <p className="text-slate-500 text-[11px] mt-1">
                      Total {billboards.length} titik reklame, status kelistrikan, dan total impresi lalu lintas Bandung.
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="font-bold text-slate-800 block">Slide 2: Audit Sensor Titik</span>
                    <p className="text-slate-500 text-[11px] mt-1">
                      Telemetri titik prioritas (Dago, Pasupati, Pasteur, Asia Afrika, Riau) mencakup getaran & daya.
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="font-bold text-slate-800 block">Slide 3: AI CRM & Retensi</span>
                    <p className="text-slate-500 text-[11px] mt-1">
                      Prediksi risiko churn klien, rekomendasi perpanjangan kontrak, dan mitigasi downtime.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GOOGLE DRIVE */}
          {activeSubTab === 'drive' && (
            <div className="space-y-4">
              <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-blue-950 flex items-center gap-2">
                    <FolderSync className="w-4 h-4 text-blue-600" />
                    <span>Sinkronisasi Folder Google Drive Otomatis</span>
                  </h4>
                  <p className="text-xs text-blue-900/80 mt-1">
                    Folder penampungan tersinkronisasi ke: <span className="font-mono">{TARGET_DRIVE_EMAIL}</span>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Folder ID: <span className="font-mono">{TARGET_FOLDER_ID}</span>
                  </p>
                </div>
                <button
                  onClick={handleFetchDriveFiles}
                  disabled={isLoading || !driveSync.accessToken}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs px-3.5 py-1.5 rounded-lg shadow transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Cek File Folder</span>
                </button>
              </div>

              {/* Remote files list */}
              <div className="border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-semibold text-xs text-slate-800">
                    File CSV di Folder Google Drive ({driveSync.remoteFiles.length})
                  </h5>
                  <span className="text-[11px] text-slate-400">
                    Terakhir diperbarui: {driveSync.lastSyncTime || 'Belum pernah'}
                  </span>
                </div>

                {driveSync.remoteFiles.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-lg">
                    Belum ada file CSV yang terdeteksi di folder Google Drive.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {driveSync.remoteFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                          <span className="font-medium text-slate-800">{file.name}</span>
                        </div>
                        <span className="text-slate-400 text-[11px]">
                          {new Date(file.modifiedTime).toLocaleDateString('id-ID')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: CLOUD FIRESTORE */}
          {activeSubTab === 'firebase' && (
            <div className="space-y-4">
              <div className="bg-orange-50/60 border border-orange-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-orange-950 flex items-center gap-2">
                    <Flame className="w-4 h-4 text-orange-600" />
                    <span>Database Cloud Firestore (Persistent)</span>
                  </h4>
                  <p className="text-xs text-orange-900/80 mt-1">
                    Project ID: <span className="font-mono font-bold">gen-lang-client-0990674468</span> • Region: <span className="font-mono">asia-southeast1</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCheckFirestore}
                    className="bg-orange-600 hover:bg-orange-700 text-white font-medium text-xs px-3.5 py-1.5 rounded-lg shadow transition flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Cek Koneksi</span>
                  </button>
                </div>
              </div>

              {/* Collections Status */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[11px] text-slate-500 block">Koleksi Billboards</span>
                  <span className="text-lg font-bold text-slate-800">{billboards.length} Dokumen</span>
                  <span className="text-[10px] text-emerald-600 block mt-0.5">🟢 Real-time Sync</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[11px] text-slate-500 block">Koleksi CRM Klien</span>
                  <span className="text-lg font-bold text-slate-800">{clients.length} Dokumen</span>
                  <span className="text-[10px] text-emerald-600 block mt-0.5">🟢 Real-time Sync</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[11px] text-slate-500 block">Aturan Keamanan</span>
                  <span className="text-lg font-bold text-slate-800">firestore.rules</span>
                  <span className="text-[10px] text-blue-600 block mt-0.5">✅ Terdeploy</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[11px] text-slate-500 block">Status Koneksi</span>
                  <span className="text-lg font-bold text-emerald-600">Terhubung</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Google Cloud SDK</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>
            Google Workspace OAuth: Drive, Sheets & Slides • Firebase Firestore
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-lg transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
