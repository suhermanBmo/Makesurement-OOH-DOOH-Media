export type BillboardType =
  | 'LED Megatron'
  | 'Digital Videotron'
  | 'Static Frontlite'
  | 'Bando Jalan'
  | 'Prisma Display';

export type BillboardStatus = 'Normal' | 'Warning' | 'Critical' | 'Maintenance' | 'Vacant';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface SensorMetrics {
  trafficVolume: number; // vehicles per hour
  pedestrianFlow: number; // pedestrians per hour
  ambientLux: number; // Lux lighting
  powerVoltage: number; // Volts (nominal 220V)
  powerCurrent: number; // Amperes
  powerKw: number; // Kilowatts
  temperature: number; // Celsius
  humidity: number; // %
  structuralVibration: number; // mm/s
  windSpeed: number; // km/h
  displayActive: boolean;
  lastUpdated: string;
}

export interface BillboardLocation {
  id: string;
  code: string; // e.g. BDO-DAGO-01
  name: string;
  address: string;
  city: string;
  coordinates: Coordinates;
  type: BillboardType;
  dimensions: string; // e.g. "8m x 16m"
  orientation: string; // e.g. "Facing South (Arah Dago Bawah)"
  roadCategory: 'Protokol Utama' | 'Arteri Primer' | 'Kolektor' | 'Jalan Tol';
  baseRateMonthly: number; // IDR per month
  currentClient: string | null;
  contractExpiry: string | null;
  status: BillboardStatus;
  metrics: SensorMetrics;
  lastCsvSync: string | null;
  photoUrl?: string;
  photos?: string[];
  availStatus?: 'Avail Sekarang' | 'Avail Segera' | 'Terisi' | 'Booking';
  availDate?: string;
  dailyImpressionsEstimate?: number;
  highlights?: string[];
}

export interface ProposalItemConfig {
  billboardId: string;
  durationMonths: number;
  customMonthlyRate?: number;
  discountPercent?: number;
  includeProduction?: boolean;
  productionCost?: number;
}

export interface ProposalRecord {
  id: string;
  proposalNumber: string;
  clientName: string;
  clientBrand: string;
  clientPic: string;
  clientEmail: string;
  clientPhone: string;
  selectedBillboardIds: string[];
  itemConfigs?: Record<string, { durationMonths: number; discountPercent: number }>;
  totalInvestment: number;
  notes?: string;
  createdAt: string;
  validUntil: string;
  sentVia?: 'whatsapp' | 'email' | 'both';
  sentAt?: string;
  status: 'draft' | 'sent' | 'negotiation' | 'approved';
}

export interface SensorThresholdConfig {
  minLuxNight: number; // Alert if lux < min during nighttime
  maxPowerCurrent: number; // Alert if current > max (overload)
  minVoltage: number; // Alert if voltage < min (undervoltage)
  maxVibration: number; // Alert if vibration > max (structural risk)
  maxWindSpeed: number; // Alert if wind > max (storm alert)
  minTrafficCongestionDrop: number; // Alert if traffic drops anomalously
  notificationEmail: string;
}

export interface AlertNotification {
  id: string;
  billboardId: string;
  billboardName: string;
  metricType: 'lux' | 'current' | 'voltage' | 'vibration' | 'wind' | 'traffic' | 'offline';
  title: string;
  message: string;
  value: number | string;
  threshold: number | string;
  severity: 'critical' | 'warning' | 'info';
  timestamp: string;
  dispatchedToEmail: string;
  dispatchedStatus: 'delivered' | 'pending' | 'failed';
  acknowledged: boolean;
}

export interface CRMClient {
  id: string;
  companyName: string;
  brand: string;
  contactPerson: string;
  email: string;
  phone: string;
  industry: 'Telekomunikasi' | 'Perbankan & Fintech' | 'E-Commerce' | 'FMCG / Minuman' | 'Otomotif' | 'Property';
  activeBillboards: string[]; // Billboard codes
  monthlySpend: number;
  contractEnd: string;
  totalLifetimeValue: number;
  churnRisk: number; // 0 - 100%
  satisfactionScore: number; // 1 - 5
  historicalCampaignImpressions: number;
  preferredAreas: string[];
}

export interface AIPredictiveReport {
  churnRiskScore: number;
  renewalProbability: number;
  sentimentAnalysis: string;
  insights: string[];
  recommendedActions: string[];
  predictedLifetimeValue: string;
  nextPeriodRetentionProbability: string;
  generatedAt: string;
  source: string;
}

export interface GoogleDriveSyncState {
  connected: boolean;
  userEmail: string | null;
  accessToken: string | null;
  folderId: string;
  syncEmail: string;
  lastSyncTime: string | null;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  syncMessage: string | null;
  remoteFiles: {
    id: string;
    name: string;
    mimeType: string;
    modifiedTime: string;
    size?: string;
  }[];
  autoSync: boolean;
  autoSyncIntervalSec: number;
}
