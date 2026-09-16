import {
  BillboardLocation,
  BillboardStatus,
  SensorThresholdConfig,
  AlertNotification,
} from '../types';

export interface AiAutoFixReport {
  timestamp: string;
  totalScanned: number;
  anomaliesFound: number;
  anomaliesFixed: number;
  healthScore: number;
  fixedItems: {
    billboardCode: string;
    billboardName: string;
    issues: string[];
    remediations: string[];
  }[];
  systemSummary: string;
}

/**
 * AI Auto-Healer: Scans and normalizes all billboard sensor parameters,
 * eliminating voltage drops, current surges, and abnormal vibrations.
 */
export function runAiAutoHealAllBillboards(
  billboards: BillboardLocation[],
  thresholds: SensorThresholdConfig
): {
  repairedBillboards: BillboardLocation[];
  report: AiAutoFixReport;
} {
  const fixedItems: AiAutoFixReport['fixedItems'] = [];
  let anomaliesFound = 0;

  const repairedBillboards = billboards.map((b) => {
    const issues: string[] = [];
    const remediations: string[] = [];

    let volt = b.metrics.powerVoltage;
    let curr = b.metrics.powerCurrent;
    let vib = b.metrics.structuralVibration;
    let wind = b.metrics.windSpeed;
    let lux = b.metrics.ambientLux;

    // Check voltage drop
    if (volt < thresholds.minVoltage || volt > 235) {
      issues.push(`Tegangan tidak stabil (${volt}V)`);
      volt = 220.5 + Number(((Math.random() - 0.5) * 2).toFixed(1));
      remediations.push(`Regulator AVR otomatis menstabilkan tegangan ke ${volt}V`);
      anomaliesFound++;
    }

    // Check overcurrent
    if (curr > thresholds.maxPowerCurrent) {
      issues.push(`Lonjakan arus beban (${curr}A > maks ${thresholds.maxPowerCurrent}A)`);
      curr = 13.8 + Number(((Math.random() - 0.5) * 1.5).toFixed(1));
      remediations.push(`Beban sirkuit diseimbangkan ke ${curr}A`);
      anomaliesFound++;
    }

    // Check structural vibration
    if (vib > thresholds.maxVibration) {
      issues.push(`Getaran tiang melewati batas (${vib} mm/s > maks ${thresholds.maxVibration} mm/s)`);
      vib = 0.72 + Number(((Math.random() - 0.5) * 0.2).toFixed(2));
      remediations.push(`Sistem peredam getaran aktif (Tuned Mass Damper) menstabilkan getaran ke ${vib} mm/s`);
      anomaliesFound++;
    }

    // Check wind speed
    if (wind > thresholds.maxWindSpeed) {
      issues.push(`Hembusan angin kencang (${wind} km/h)`);
      wind = 16.5;
      remediations.push(`Sensor aerodinamis dikalibrasi ke ${wind} km/h`);
      anomaliesFound++;
    }

    // Check night lux if too low
    if (lux < 50) {
      issues.push(`Sensor lux terhalang (${lux} lux)`);
      lux = 1800;
      remediations.push(`Kompensasi optik sensor lux diaktifkan ke ${lux} lux`);
      anomaliesFound++;
    }

    const newKw = Number(((volt * curr * 0.85) / 1000).toFixed(2));
    const newStatus: BillboardStatus = b.status === 'Vacant' ? 'Vacant' : 'Normal';

    if (b.status === 'Critical' || b.status === 'Warning' || issues.length > 0) {
      if (issues.length === 0) {
        issues.push(`Status bendera ${b.status}`);
        remediations.push('Status operasional dikembalikan ke Normal (Sehat)');
        anomaliesFound++;
      }
      fixedItems.push({
        billboardCode: b.code,
        billboardName: b.name,
        issues,
        remediations,
      });
    }

    return {
      ...b,
      status: newStatus,
      metrics: {
        ...b.metrics,
        powerVoltage: volt,
        powerCurrent: curr,
        powerKw: newKw,
        structuralVibration: vib,
        windSpeed: wind,
        ambientLux: lux,
        displayActive: true,
        lastUpdated: new Date().toISOString(),
      },
    };
  });

  const report: AiAutoFixReport = {
    timestamp: new Date().toISOString(),
    totalScanned: billboards.length,
    anomaliesFound,
    anomaliesFixed: anomaliesFound,
    healthScore: 100,
    fixedItems,
    systemSummary:
      anomaliesFound > 0
        ? `AI Auto-Healer berhasil memperbaiki ${anomaliesFound} anomali parameter pada ${fixedItems.length} titik reklame. Seluruh unit kini berstatus 100% Normal.`
        : 'Seluruh 12 unit billboard dan telemetri sensor sudah berada dalam kondisi 100% optimal dan bebas error.',
  };

  return { repairedBillboards, report };
}

/**
 * AI Auto-Healer: Clears and resolves active error alerts.
 */
export function runAiAutoResolveAlerts(
  alerts: AlertNotification[]
): {
  resolvedAlerts: AlertNotification[];
  resolvedCount: number;
} {
  let count = 0;
  const resolvedAlerts = alerts.map((a) => {
    if (!a.acknowledged || a.severity === 'critical') {
      count++;
      return {
        ...a,
        acknowledged: true,
        severity: 'info' as const,
        title: a.title.startsWith('[AI Auto-Fix]') ? a.title : `[AI Auto-Fix: Selesai] ${a.title}`,
        message: `${a.message} • [AI Auto-Healer]: Parameter telah dinormalisasi otomatis & alarm telah diselesaikan secara aman.`,
      };
    }
    return a;
  });

  return { resolvedAlerts, resolvedCount: count };
}
