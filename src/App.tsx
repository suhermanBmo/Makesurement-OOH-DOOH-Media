import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BillboardLocation,
  CRMClient,
  SensorThresholdConfig,
  AlertNotification,
  GoogleDriveSyncState,
  ProposalRecord,
} from './types';
import {
  INITIAL_BILLBOARDS,
  INITIAL_CLIENTS,
  INITIAL_THRESHOLDS,
  INITIAL_ALERTS,
} from './data/initialData';
import { TARGET_FOLDER_ID, TARGET_DRIVE_EMAIL } from './services/googleDriveService';
import { Header } from './components/Header';
import { InteractiveMap } from './components/InteractiveMap';
import { SensorMonitor } from './components/SensorMonitor';
import { CrmPredictiveModal } from './components/CrmPredictiveModal';
import { WorkspaceHubModal } from './components/WorkspaceHubModal';
import { ThresholdAlertsModal } from './components/ThresholdAlertsModal';
import { BillboardDetailModal } from './components/BillboardDetailModal';
import { ProposalGeneratorView } from './components/ProposalGeneratorView';
import { initAuth } from './services/firebaseAuth';
import {
  seedInitialFirestoreDataIfEmpty,
  subscribeToBillboards,
  subscribeToAlerts,
  subscribeToThresholds,
  subscribeToProposals,
  saveAlertToFirestore,
  saveThresholdsToFirestore,
  acknowledgeAlertInFirestore,
  cleanupPencahayaanAlertsFromFirestore,
} from './services/firestoreService';
import { useToast } from './components/Toast';

export default function App() {
  const { showToast } = useToast();

  // Navigation
  const [activeTab, setActiveTab] = useState<'map' | 'database' | 'crm' | 'sync' | 'proposals'>('map');

  // Core Data States
  const [billboards, setBillboards] = useState<BillboardLocation[]>(INITIAL_BILLBOARDS);
  const [clients, setClients] = useState<CRMClient[]>(INITIAL_CLIENTS);
  const [thresholds, setThresholds] = useState<SensorThresholdConfig>(INITIAL_THRESHOLDS);
  const [alerts, setAlerts] = useState<AlertNotification[]>(INITIAL_ALERTS);
  const [savedProposals, setSavedProposals] = useState<ProposalRecord[]>([]);

  // Selected Entities
  const [selectedBillboard, setSelectedBillboard] = useState<BillboardLocation | null>(null);
  const [detailBillboard, setDetailBillboard] = useState<BillboardLocation | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(undefined);

  // Modals
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [isThresholdModalOpen, setIsThresholdModalOpen] = useState(false);

  // Simulation & Stream
  const [isSimulating, setIsSimulating] = useState(true);

  // Google Drive Sync State
  const [driveSync, setDriveSync] = useState<GoogleDriveSyncState>({
    connected: false,
    userEmail: null,
    accessToken: null,
    folderId: TARGET_FOLDER_ID,
    syncEmail: TARGET_DRIVE_EMAIL,
    lastSyncTime: null,
    syncStatus: 'idle',
    syncMessage: null,
    remoteFiles: [],
    autoSync: true,
    autoSyncIntervalSec: 60,
  });

  // Keep a ref to latest alerts & thresholds to avoid stale closures in interval
  const alertsRef = useRef(alerts);
  alertsRef.current = alerts;
  const thresholdsRef = useRef(thresholds);
  thresholdsRef.current = thresholds;

  // Initialize Firebase Auth & Firestore listeners on mount
  useEffect(() => {
    const unsubscribeAuth = initAuth(
      (user, token) => {
        setDriveSync((prev) => ({
          ...prev,
          connected: true,
          userEmail: user.email,
          accessToken: token,
          syncStatus: 'success',
          syncMessage: `Terhubung dengan Google Workspace: ${user.email}`,
        }));
      },
      () => {
        // Not authenticated yet
      }
    );

    // Initial Firestore setup & seed
    seedInitialFirestoreDataIfEmpty().catch((err) => {
      console.warn('Firestore seed warning:', err);
    });
    cleanupPencahayaanAlertsFromFirestore().catch(() => {});

    // Real-time Firestore subscriptions
    const unsubBillboards = subscribeToBillboards((remoteBillboards) => {
      if (remoteBillboards && remoteBillboards.length > 0) {
        setBillboards(remoteBillboards);
      }
    });

    const unsubAlerts = subscribeToAlerts((remoteAlerts) => {
      if (remoteAlerts) {
        setAlerts(remoteAlerts.filter((a) => !a.title?.toLowerCase().includes('pencahayaan')));
      }
    });

    const unsubThresholds = subscribeToThresholds((remoteThresholds) => {
      if (remoteThresholds) {
        setThresholds(remoteThresholds);
      }
    });

    const unsubProposals = subscribeToProposals((remoteProposals) => {
      if (remoteProposals) {
        setSavedProposals(remoteProposals);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubBillboards();
      unsubAlerts();
      unsubThresholds();
      unsubProposals();
    };
  }, []);

  // Dispatch alert to backend & Firestore
  const dispatchAlertNotification = useCallback(
    async (
      billboard: BillboardLocation,
      metricType: AlertNotification['metricType'],
      title: string,
      message: string,
      value: string | number,
      thresholdVal: string | number,
      severity: 'critical' | 'warning' | 'info'
    ) => {
      // Suppress any alert containing 'pencahayaan'
      if (title.toLowerCase().includes('pencahayaan')) {
        return;
      }

      const newAlert: AlertNotification = {
        id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        billboardId: billboard.id,
        billboardName: billboard.name,
        metricType,
        title,
        message,
        value,
        threshold: thresholdVal,
        severity,
        timestamp: new Date().toISOString(),
        dispatchedToEmail: thresholdsRef.current.notificationEmail,
        dispatchedStatus: 'delivered',
        acknowledged: false,
      };

      setAlerts((prev) => [newAlert, ...prev.slice(0, 49)]);

      // Save to Cloud Firestore
      saveAlertToFirestore(newAlert).catch((err) => {
        console.warn('Could not save alert to Firestore:', err);
      });

      // Call server to simulate email transmission to suherman.reklame2012@gmail.com
      try {
        await fetch('/api/notifications/dispatch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            notification: newAlert,
            targetEmail: thresholdsRef.current.notificationEmail,
          }),
        });
      } catch (err) {
        console.warn('Dispatch simulation error:', err);
      }
    },
    []
  );

  // Real-Time Sensor Telemetry Stream & Threshold Monitor
  useEffect(() => {
    if (!isSimulating) return;

    const timer = setInterval(() => {
      setBillboards((prev) => {
        return prev.map((b) => {
          // If in an induced spike condition, maintain or slowly normalize
          const currentT = thresholdsRef.current;
          const deltaTraffic = (Math.random() - 0.48) * 40;
          const deltaLux = (Math.random() - 0.5) * 30;
          const deltaVolt = (Math.random() - 0.5) * 0.4;
          const deltaCurr = (Math.random() - 0.5) * 0.2;
          const deltaWind = (Math.random() - 0.5) * 0.8;
          const deltaVib = (Math.random() - 0.5) * 0.05;

          const newTraffic = Math.max(200, Math.round(b.metrics.trafficVolume + deltaTraffic));
          const newLux = Math.max(10, Math.round(b.metrics.ambientLux + deltaLux));
          const newVolt = Number((b.metrics.powerVoltage + deltaVolt).toFixed(1));
          const newCurr = Number(Math.max(1, b.metrics.powerCurrent + deltaCurr).toFixed(1));
          const newKw = Number(((newVolt * newCurr * 0.85) / 1000).toFixed(2));
          const newVib = Number(Math.max(0.1, b.metrics.structuralVibration + deltaVib).toFixed(2));
          const newWind = Number(Math.max(1, b.metrics.windSpeed + deltaWind).toFixed(1));

          // Evaluate Thresholds
          let updatedStatus = b.status;
          const isCritical =
            newCurr > currentT.maxPowerCurrent ||
            newVib > currentT.maxVibration ||
            newWind > currentT.maxWindSpeed ||
            newVolt < currentT.minVoltage;

          const isWarning = newLux < currentT.minLuxNight;

          if (isCritical) {
            updatedStatus = 'Critical';
          } else if (isWarning) {
            updatedStatus = 'Warning';
          } else if (b.status !== 'Vacant') {
            updatedStatus = 'Normal';
          }

          // Trigger automated alert if threshold violated and not already flagged recently
          if (isCritical && b.status !== 'Critical') {
            if (newCurr > currentT.maxPowerCurrent) {
              dispatchAlertNotification(
                b,
                'current',
                `Lonjakan Arus Listrik Melebihi ${currentT.maxPowerCurrent}A`,
                `Sensor daya mengukur ${newCurr}A pada tegangan ${newVolt}V. Indikasi beban berlebih.`,
                `${newCurr} A`,
                `${currentT.maxPowerCurrent} A`,
                'critical'
              );
            } else if (newVib > currentT.maxVibration) {
              dispatchAlertNotification(
                b,
                'vibration',
                `Getaran Tiang Monopole Kritis (> ${currentT.maxVibration} mm/s)`,
                `Getaran mekanik terdeteksi ${newVib} mm/s dengan hembusan angin ${newWind} km/h.`,
                `${newVib} mm/s`,
                `${currentT.maxVibration} mm/s`,
                'critical'
              );
            }
          }

          return {
            ...b,
            status: updatedStatus,
            metrics: {
              ...b.metrics,
              trafficVolume: newTraffic,
              ambientLux: newLux,
              powerVoltage: newVolt,
              powerCurrent: newCurr,
              powerKw: newKw,
              structuralVibration: newVib,
              windSpeed: newWind,
              lastUpdated: new Date().toISOString(),
            },
          };
        });
      });
    }, 3000);

    return () => clearInterval(timer);
  }, [isSimulating, dispatchAlertNotification]);

  // Handlers for simulator triggers
  const handleTriggerSpike = (
    type: 'wind' | 'lux' | 'power' | 'traffic',
    billboardCode: string
  ) => {
    setBillboards((prev) =>
      prev.map((b) => {
        if (b.code !== billboardCode) return b;
        const metrics = { ...b.metrics };
        let newStatus = b.status;

        if (type === 'wind') {
          metrics.windSpeed = 46.5;
          metrics.structuralVibration = 3.4;
          newStatus = 'Critical';
          dispatchAlertNotification(
            b,
            'wind',
            'Peringatan Badai Angin Kencang (46.5 km/h)',
            `Hembusan angin ekstrem mencapai 46.5 km/h menyebabkan getaran struktur 3.4 mm/s di flyover.`,
            '46.5 km/h',
            `${thresholds.maxWindSpeed} km/h`,
            'critical'
          );
        } else if (type === 'lux') {
          metrics.ambientLux = 65; // Below threshold 120
          newStatus = 'Warning';
          dispatchAlertNotification(
            b,
            'lux',
            'Modul Spotlight Padam (65 Lux)',
            `Lampu penerangan billboard mengalami trip, intensitas lux turun drastis ke 65 Lux.`,
            '65 Lux',
            `${thresholds.minLuxNight} Lux`,
            'warning'
          );
        } else if (type === 'power') {
          metrics.powerCurrent = 27.2;
          metrics.powerVoltage = 189.5;
          metrics.powerKw = 4.38;
          newStatus = 'Critical';
          dispatchAlertNotification(
            b,
            'current',
            'Lonjakan Beban Arus & Drop Tegangan Listrik (27.2A)',
            `Beban trafo melebihi batas aman 24A, memicu sinyal pemutusan saklar otomatis (MCB).`,
            '27.2 A',
            `${thresholds.maxPowerCurrent} A`,
            'critical'
          );
        }

        return { ...b, metrics, status: newStatus };
      })
    );
  };

  const handleResetSensors = () => {
    setBillboards(INITIAL_BILLBOARDS);
    setAlerts((prev) =>
      prev.map((a) => ({
        ...a,
        acknowledged: true,
      }))
    );
  };

  const handleRunAiForBillboard = (b: BillboardLocation) => {
    if (b.currentClient) {
      const client = clients.find((c) =>
        c.activeBillboards.includes(b.code) || c.companyName.includes(b.currentClient || '')
      );
      if (client) {
        setSelectedClientId(client.id);
      }
    }
    setActiveTab('crm');
  };

  const handleAcknowledgeAlert = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, acknowledged: true } : a))
    );
    acknowledgeAlertInFirestore(alertId).catch((err) => {
      console.warn('Could not update alert status in Firestore:', err);
    });
  };

  const handleClearAcknowledged = () => {
    setAlerts((prev) => prev.filter((a) => !a.acknowledged));
  };

  const handleSendTestNotification = async () => {
    const testAlert: AlertNotification = {
      id: `test-${Date.now()}`,
      billboardId: 'test-bb',
      billboardName: 'Simpang Dago Heritage Megatron (Test Node)',
      metricType: 'wind',
      title: 'Uji Coba Sistem Notifikasi Ambang Batas Berhasil',
      message: `Pesan uji coba peringatan otomatis terkirim dari sistem sensor ke ${thresholds.notificationEmail}.`,
      value: 'Tes Normal',
      threshold: 'Normal',
      severity: 'info',
      timestamp: new Date().toISOString(),
      dispatchedToEmail: thresholds.notificationEmail,
      dispatchedStatus: 'delivered',
      acknowledged: false,
    };

    setAlerts((prev) => [testAlert, ...prev]);

    try {
      await fetch('/api/notifications/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notification: testAlert,
          targetEmail: thresholds.notificationEmail,
        }),
      });
      showToast('Notifikasi Terkirim', 'success', `Uji coba peringatan berhasil disimulasikan ke ${thresholds.notificationEmail}`);
    } catch (err) {
      console.error(err);
      showToast('Gagal Mengirim Notifikasi', 'error', 'Terjadi kendala pada simulasi pengiriman.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Main Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        driveSync={driveSync}
        setDriveSync={setDriveSync}
        alerts={alerts}
        onOpenAlertsModal={() => setIsThresholdModalOpen(true)}
        onOpenDriveModal={() => setIsDriveModalOpen(true)}
        onOpenThresholdModal={() => setIsThresholdModalOpen(true)}
        isSimulating={isSimulating}
        setIsSimulating={setIsSimulating}
      />

      {/* Main App View based on selected tab */}
      <main className="flex-1 w-full overflow-y-auto">
        {activeTab === 'map' && (
          <InteractiveMap
            billboards={billboards}
            selectedBillboard={selectedBillboard}
            onSelectBillboard={(b) => {
              setSelectedBillboard(b);
              setDetailBillboard(b);
            }}
            onOpenDetailModal={(b) => setDetailBillboard(b)}
            thresholds={thresholds}
            onRunAiForBillboard={handleRunAiForBillboard}
          />
        )}

        {activeTab === 'database' && (
          <SensorMonitor
            billboards={billboards}
            thresholds={thresholds}
            onSelectBillboard={(b) => setDetailBillboard(b)}
            onTriggerSpike={handleTriggerSpike}
            onResetSensors={handleResetSensors}
            onOpenSyncModal={() => setIsDriveModalOpen(true)}
            onRunAiForBillboard={handleRunAiForBillboard}
          />
        )}

        {activeTab === 'crm' && (
          <CrmPredictiveModal
            clients={clients}
            billboards={billboards}
            selectedClientId={selectedClientId}
            onSelectClient={(c) => setSelectedClientId(c.id)}
          />
        )}

        {activeTab === 'sync' && (
          <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                    <span>Google Workspace & Cloud Sync Hub</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      Aktif
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Integrasi 4 Pilar: Google Sheets, Google Slides, Google Drive CSV, dan Cloud Firestore
                  </p>
                </div>
                <button
                  onClick={() => setIsDriveModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow transition-colors flex items-center gap-2"
                >
                  <span>Buka Panel Kontrol Workspace</span>
                </button>
              </div>

              {/* 4 Cards for 4 Ecosystem Integrations */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                {/* 1. Google Sheets */}
                <div className="p-4 bg-slate-800/60 rounded-2xl border border-emerald-600/30 flex flex-col justify-between">
                  <div>
                    <span className="text-emerald-400 font-bold block text-xs">📊 Google Sheets</span>
                    <p className="text-slate-300 text-[11px] mt-1">
                      Sinkronisasi 26 kolom telemetri ke spreadsheet Google Drive.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsDriveModalOpen(true)}
                    className="mt-3 w-full py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-medium text-[11px] transition"
                  >
                    Ekspor / Impor Sheet
                  </button>
                </div>

                {/* 2. Google Slides */}
                <div className="p-4 bg-slate-800/60 rounded-2xl border border-amber-500/30 flex flex-col justify-between">
                  <div>
                    <span className="text-amber-400 font-bold block text-xs">📽️ Google Slides</span>
                    <p className="text-slate-300 text-[11px] mt-1">
                      Generator dek presentasi eksekutif & audit mingguan otomatis.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsDriveModalOpen(true)}
                    className="mt-3 w-full py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-medium text-[11px] transition"
                  >
                    Buat Presentasi Slides
                  </button>
                </div>

                {/* 3. Google Drive */}
                <div className="p-4 bg-slate-800/60 rounded-2xl border border-cyan-500/30 flex flex-col justify-between">
                  <div>
                    <span className="text-cyan-400 font-bold block text-xs">📁 Google Drive CSV</span>
                    <p className="text-slate-300 text-[11px] mt-1 truncate">
                      Folder: 16cxwHJQ3YUdMFjc...
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                      {TARGET_DRIVE_EMAIL}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsDriveModalOpen(true)}
                    className="mt-3 w-full py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 font-medium text-[11px] transition"
                  >
                    Kelola File CSV
                  </button>
                </div>

                {/* 4. Cloud Firestore */}
                <div className="p-4 bg-slate-800/60 rounded-2xl border border-orange-500/30 flex flex-col justify-between">
                  <div>
                    <span className="text-orange-400 font-bold block text-xs">🔥 Cloud Firestore</span>
                    <p className="text-slate-300 text-[11px] mt-1">
                      Database persistent multi-device dengan keamanan tersertifikasi.
                    </p>
                    <span className="text-[10px] text-emerald-400 font-medium block mt-0.5">
                      🟢 Terhubung Real-Time
                    </span>
                  </div>
                  <button
                    onClick={() => setIsDriveModalOpen(true)}
                    className="mt-3 w-full py-1.5 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/30 font-medium text-[11px] transition"
                  >
                    Status Database
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Proposals View */}
        {activeTab === 'proposals' && (
          <ProposalGeneratorView
            billboards={billboards}
            clients={clients}
            savedProposals={savedProposals}
            onSelectBillboardForMap={(bb) => {
              setSelectedBillboard(bb);
              setActiveTab('map');
            }}
          />
        )}
      </main>

      {/* Global Modals */}
      <WorkspaceHubModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        driveSync={driveSync}
        setDriveSync={setDriveSync}
        billboards={billboards}
        clients={clients}
        onUpdateBillboards={(newB) => setBillboards(newB)}
        onAddAlert={(title, message, severity) => {
          dispatchAlertNotification(
            billboards[0] || INITIAL_BILLBOARDS[0],
            'traffic',
            title,
            message,
            '-',
            '-',
            severity
          );
        }}
      />

      <ThresholdAlertsModal
        isOpen={isThresholdModalOpen}
        onClose={() => setIsThresholdModalOpen(false)}
        thresholds={thresholds}
        onUpdateThresholds={(newT) => {
          setThresholds(newT);
          saveThresholdsToFirestore(newT).catch((err) => {
            console.warn('Could not save thresholds to Firestore:', err);
          });
        }}
        alerts={alerts}
        onAcknowledgeAlert={handleAcknowledgeAlert}
        onClearAcknowledged={handleClearAcknowledged}
        onSendTestNotification={handleSendTestNotification}
      />

      <BillboardDetailModal
        billboard={detailBillboard}
        onClose={() => setDetailBillboard(null)}
        thresholds={thresholds}
        onRunAiForBillboard={handleRunAiForBillboard}
        onOpenProposalForBillboard={() => {
          setDetailBillboard(null);
          setActiveTab('proposals');
        }}
      />
    </div>
  );
}
