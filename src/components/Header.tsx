import React from 'react';
import {
  Radio,
  MapPin,
  RefreshCw,
  Bell,
  Sparkles,
  FolderSync,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  LogOut,
  User as UserIcon,
  Send,
} from 'lucide-react';
import { GoogleDriveSyncState, AlertNotification } from '../types';
import { googleSignIn, logout } from '../services/firebaseAuth';
import { useToast } from './Toast';

interface HeaderProps {
  activeTab: 'map' | 'database' | 'crm' | 'sync' | 'proposals';
  setActiveTab: (tab: 'map' | 'database' | 'crm' | 'sync' | 'proposals') => void;
  driveSync: GoogleDriveSyncState;
  setDriveSync: React.Dispatch<React.SetStateAction<GoogleDriveSyncState>>;
  alerts: AlertNotification[];
  onOpenAlertsModal: () => void;
  onOpenDriveModal: () => void;
  onOpenThresholdModal: () => void;
  isSimulating: boolean;
  setIsSimulating: React.Dispatch<React.SetStateAction<boolean>>;
  onOpenAiHealerModal?: () => void;
  isStudioMode?: boolean;
  onToggleStudioMode?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  driveSync,
  setDriveSync,
  alerts,
  onOpenAlertsModal,
  onOpenDriveModal,
  onOpenThresholdModal,
  isSimulating,
  setIsSimulating,
  onOpenAiHealerModal,
  isStudioMode = true,
  onToggleStudioMode,
}) => {
  const { showToast } = useToast();
  const unreadAlerts = alerts.filter((a) => !a.acknowledged);
  const criticalAlerts = unreadAlerts.filter((a) => a.severity === 'critical');

  const handleSignIn = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setDriveSync((prev) => ({
          ...prev,
          connected: true,
          userEmail: result.user.email,
          accessToken: result.accessToken,
          syncStatus: 'success',
          syncMessage: `Terhubung dengan Google Drive: ${result.user.email}`,
        }));
        showToast('Google Workspace Terhubung', 'success', `Berhasil masuk sebagai ${result.user.email}`);
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
      showToast('Gagal Menghubungkan Google', 'error', err?.message || 'Akses ditolak atau pop-up diblokir.');
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      setDriveSync((prev) => ({
        ...prev,
        connected: false,
        userEmail: null,
        accessToken: null,
        syncStatus: 'idle',
        syncMessage: 'Koneksi Google Drive terputus.',
      }));
      showToast('Koneksi Diputus', 'info', 'Koneksi akun Google berhasil diputuskan.');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
      {/* Top Banner / Status Strip */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Live Indicator */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Radio className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white">
                Bandung Media Outdoor
              </h1>
              {isStudioMode ? (
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Peta OpenStreetMap (Tanpa API Key)
                </span>
              ) : (
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Sistem Informasi Reklame
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {isStudioMode
                ? 'Database Lokasi & IoT Billboard • Google Sheets & Slides • AI CRM'
                : 'Sistem Informasi Lokasi & Telemetri Billboard Bandung Outdoor'}
            </p>
          </div>
        </div>

        {/* Action Controls & Authentication */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Mode Switcher Toggle Button */}
          {onToggleStudioMode && (
            <button
              onClick={onToggleStudioMode}
              title={
                isStudioMode
                  ? 'Mode Studio / Deploy aktif. Klik untuk pratinjau Mode Publikasi (sembunyikan menu internal).'
                  : 'Mode Publikasi aktif. Klik untuk membuka Menu Studio & Deploy.'
              }
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer shadow-sm ${
                isStudioMode
                  ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/40 ring-1 ring-amber-500/20'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isStudioMode ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
                }`}
              />
              <span>{isStudioMode ? 'Studio Deploy' : 'Mode Publik'}</span>
            </button>
          )}

          {/* Internal Studio Developer & Simulation Controls - ONLY visible in Studio Deploy Mode */}
          {isStudioMode && (
            <>
              {/* AI Auto-Healer Sentinel Button */}
              {onOpenAiHealerModal && (
                <button
                  onClick={onOpenAiHealerModal}
                  title="Buka AI Auto-Healer: Diagnostik & Perbaikan Otomatis Seluruh Sistem"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border-emerald-600/50 shadow-sm cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span>AI Auto-Fix</span>
                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-[10px] text-emerald-300 border border-emerald-500/30">
                    {criticalAlerts.length === 0 ? '100% Sehat' : 'Stabilkan'}
                  </span>
                </button>
              )}

              {/* Real-time simulation toggle */}
              <button
                onClick={() => setIsSimulating(!isSimulating)}
                title={isSimulating ? 'Jeda Simulasi Sensor Real-Time' : 'Aktifkan Simulasi Sensor Real-Time'}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  isSimulating
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/50 hover:bg-emerald-900/80'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
                <span>{isSimulating ? 'Sensor Stream: Aktif' : 'Sensor: Dijeda'}</span>
              </button>

              {/* Threshold alert settings */}
              <button
                onClick={onOpenThresholdModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-colors"
              >
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline">Ambang Batas</span>
              </button>

              {/* Google Drive Status & Sign In Button */}
              {driveSync.connected && driveSync.userEmail ? (
                <div className="flex items-center gap-2 bg-slate-800/90 border border-emerald-600/40 rounded-lg px-2.5 py-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <div className="text-left">
                    <p className="text-[10px] text-slate-400 leading-tight">Google Workspace & Cloud</p>
                    <p className="text-xs font-medium text-emerald-300 truncate max-w-[130px]">
                      {driveSync.userEmail}
                    </p>
                  </div>
                  <button
                    onClick={onOpenDriveModal}
                    title="Kelola Google Sheets, Slides & Drive Sync"
                    className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white"
                  >
                    <FolderSync className="w-3.5 h-3.5 text-cyan-400" />
                  </button>
                  <button
                    onClick={handleSignOut}
                    title="Keluar dari Google Workspace"
                    className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-rose-400"
                  >
                    <LogOut className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleSignIn}
                  title="Hubungkan akun Google untuk integrasi Sheets, Slides & Drive"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-slate-800 hover:bg-slate-100 shadow transition-all border border-slate-300 active:scale-95"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12 5c1.7 0 3 .6 4 1.5l3-3C17.2 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.4l3.6 2.8C6.4 7.2 8.9 5 12 5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.5 14.8c-.2-.7-.4-1.5-.4-2.8 0-1.3.2-2.1.4-2.8L1.9 6.4C.7 8.8 0 10.3 0 12c0 1.7.7 3.2 1.9 5.6l3.6-2.8z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c3.2 0 6-1.1 7.9-3l-3.7-2.9c-1.1.7-2.5 1.2-4.2 1.2-3.1 0-5.6-2.2-6.5-5.2L1.9 16C3.7 19.8 7.5 23 12 23z"
                    />
                  </svg>
                  <span>Sambungkan Workspace</span>
                </button>
              )}
            </>
          )}

          {/* Notification Center Bell */}
          <button
            onClick={onOpenAlertsModal}
            className="relative p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            title={`${unreadAlerts.length} Notifikasi Ambang Batas`}
          >
            <Bell className="w-4 h-4" />
            {unreadAlerts.length > 0 && (
              <span
                className={`absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full text-[10px] font-bold flex items-center justify-center text-white ${
                  criticalAlerts.length > 0 ? 'bg-rose-600 animate-bounce' : 'bg-amber-500'
                }`}
              >
                {unreadAlerts.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Navigation Sub-bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between border-t border-slate-800 overflow-x-auto no-scrollbar">
        <nav className="flex space-x-1 py-2">
          <button
            onClick={() => setActiveTab('map')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'map'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Peta & Telemetri Sensor</span>
          </button>

          <button
            onClick={() => setActiveTab('database')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'database'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Database Billboard</span>
          </button>

          <button
            onClick={() => setActiveTab('crm')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'crm'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Automatisasi AI CRM</span>
          </button>

          <button
            onClick={() => setActiveTab('proposals')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'proposals'
                ? 'bg-amber-500 text-slate-950 shadow-sm ring-1 ring-amber-400'
                : 'text-emerald-400 hover:text-emerald-300 hover:bg-slate-800'
            }`}
          >
            <Send className="w-3.5 h-3.5 text-emerald-400" />
            <span>Kirim Penawaran Avail (WA & Email)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/40">
              Auto
            </span>
          </button>

          {/* Workspace & Cloud Sync tab - ONLY visible in Studio Deploy Mode */}
          {isStudioMode && (
            <button
              onClick={() => setActiveTab('sync')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'sync'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <FolderSync className="w-3.5 h-3.5 text-cyan-400" />
              <span>Workspace & Cloud Sync (Sheets, Slides, Drive)</span>
            </button>
          )}
        </nav>

        {/* Quick Folder Reference Link - ONLY visible in Studio Deploy Mode */}
        {isStudioMode && (
          <div className="hidden lg:flex items-center gap-3 text-xs text-slate-400 py-2">
            <span>Target Folder:</span>
            <a
              href="https://drive.google.com/drive/folders/16cxwHJQ3YUdMFjcS0nvcHXguSeS5EDxh?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-mono text-[11px] bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700"
            >
              <span>16cxwHJQ...EDxh</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <span className="text-slate-600">•</span>
            <span className="text-slate-300 text-[11px] font-mono">
              suherman.reklame2012@gmail.com
            </span>
          </div>
        )}
      </div>
    </header>
  );
};
