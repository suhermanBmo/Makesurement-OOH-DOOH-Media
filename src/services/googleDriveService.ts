import Papa from 'papaparse';
import { BillboardLocation, SensorMetrics } from '../types';

export const TARGET_FOLDER_ID = '16cxwHJQ3YUdMFjcS0nvcHXguSeS5EDxh';
export const TARGET_DRIVE_EMAIL = 'suherman.reklame2012@gmail.com';

export interface RemoteDriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
}

/**
 * List files inside the shared Google Drive folder using the Drive v3 REST API
 */
export async function listFolderFiles(
  accessToken: string,
  folderId: string = TARGET_FOLDER_ID
): Promise<RemoteDriveFile[]> {
  try {
    const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
    const fields = encodeURIComponent('files(id, name, mimeType, modifiedTime, size)');
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&pageSize=30`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Google Drive API error: ${res.status}`);
    }

    const data = await res.json();
    return data.files || [];
  } catch (error: any) {
    console.error('Failed to list Google Drive files:', error);
    throw error;
  }
}

/**
 * Download text/CSV content of a specific file from Google Drive
 */
export async function downloadDriveFileText(
  accessToken: string,
  fileId: string
): Promise<string> {
  try {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to download file from Google Drive: ${res.status}`);
    }

    return await res.text();
  } catch (error: any) {
    console.error('Error downloading drive file:', error);
    throw error;
  }
}

/**
 * Upload or synchronize a CSV file to Google Drive folder
 */
export async function uploadCsvToDrive(
  accessToken: string,
  fileName: string,
  csvContent: string,
  folderId: string = TARGET_FOLDER_ID
): Promise<{ id: string; name: string }> {
  try {
    const metadata = {
      name: fileName,
      mimeType: 'text/csv',
      parents: [folderId],
    };

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: text/csv\r\n\r\n' +
      csvContent +
      closeDelimiter;

    const res = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to upload CSV to Google Drive: ${res.status}`);
    }

    return await res.json();
  } catch (error: any) {
    console.error('Error uploading CSV to Google Drive:', error);
    throw error;
  }
}

/**
 * Parse CSV text into BillboardLocation array with validation & column normalization
 */
export function parseBillboardCsv(csvText: string): {
  billboards: BillboardLocation[];
  errors: string[];
} {
  const result = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });

  const billboards: BillboardLocation[] = [];
  const errors: string[] = [];

  const rows = result.data as Record<string, any>[];

  rows.forEach((row, index) => {
    try {
      const code = String(row.code || row.kode || row.id || `BDO-${100 + index}`);
      const name = String(row.name || row.nama_lokasi || row.lokasi || `Billboard Titik ${code}`);
      const address = String(row.address || row.alamat || 'Jl. Protokol Bandung');
      const lat = Number(row.lat || row.latitude || -6.90389 + (Math.random() - 0.5) * 0.05);
      const lng = Number(row.lng || row.longitude || 107.61861 + (Math.random() - 0.5) * 0.05);

      const metrics: SensorMetrics = {
        trafficVolume: Number(row.trafficVolume || row.lalu_lintas || Math.floor(2500 + Math.random() * 4000)),
        pedestrianFlow: Number(row.pedestrianFlow || row.pejalan_kaki || Math.floor(400 + Math.random() * 1200)),
        ambientLux: Number(row.ambientLux || row.lux || Math.floor(800 + Math.random() * 4000)),
        powerVoltage: Number(row.powerVoltage || row.tegangan || (218 + Math.random() * 6).toFixed(1)),
        powerCurrent: Number(row.powerCurrent || row.arus || (12 + Math.random() * 8).toFixed(1)),
        powerKw: Number(row.powerKw || row.daya_kw || (2.8 + Math.random() * 2).toFixed(2)),
        temperature: Number(row.temperature || row.suhu || (26 + Math.random() * 5).toFixed(1)),
        humidity: Number(row.humidity || row.kelembapan || Math.floor(65 + Math.random() * 20)),
        structuralVibration: Number(row.structuralVibration || row.getaran || (0.8 + Math.random() * 1.5).toFixed(2)),
        windSpeed: Number(row.windSpeed || row.kecepatan_angin || (12 + Math.random() * 15).toFixed(1)),
        displayActive: row.displayActive !== undefined ? Boolean(row.displayActive) : true,
        lastUpdated: new Date().toISOString(),
      };

      const billboard: BillboardLocation = {
        id: `billboard-${code.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        code,
        name,
        address,
        city: 'Bandung',
        coordinates: { lat, lng },
        type: row.type || row.tipe || 'LED Megatron',
        dimensions: row.dimensions || row.ukuran || '8m x 16m',
        orientation: row.orientation || row.arah_hadap || 'Facing North',
        roadCategory: row.roadCategory || row.kategori_jalan || 'Protokol Utama',
        baseRateMonthly: Number(row.baseRateMonthly || row.tarif_bulanan || 45000000),
        currentClient: row.currentClient || row.klien || null,
        contractExpiry: row.contractExpiry || row.jatuh_tempo || '2026-12-31',
        status: (row.status as any) || 'Normal',
        metrics,
        lastCsvSync: new Date().toLocaleTimeString('id-ID'),
      };

      billboards.push(billboard);
    } catch (err: any) {
      errors.push(`Baris ${index + 1}: Format data tidak valid (${err.message})`);
    }
  });

  return { billboards, errors };
}

/**
 * Generate CSV string from BillboardLocation array for syncing/export
 */
export function exportBillboardsToCsv(billboards: BillboardLocation[]): string {
  const flattenedData = billboards.map((b) => ({
    code: b.code,
    name: b.name,
    address: b.address,
    lat: b.coordinates.lat,
    lng: b.coordinates.lng,
    type: b.type,
    dimensions: b.dimensions,
    orientation: b.orientation,
    roadCategory: b.roadCategory,
    status: b.status,
    currentClient: b.currentClient || '',
    contractExpiry: b.contractExpiry || '',
    baseRateMonthly: b.baseRateMonthly,
    trafficVolume: b.metrics.trafficVolume,
    pedestrianFlow: b.metrics.pedestrianFlow,
    ambientLux: b.metrics.ambientLux,
    powerVoltage: b.metrics.powerVoltage,
    powerCurrent: b.metrics.powerCurrent,
    powerKw: b.metrics.powerKw,
    temperature: b.metrics.temperature,
    humidity: b.metrics.humidity,
    structuralVibration: b.metrics.structuralVibration,
    windSpeed: b.metrics.windSpeed,
    lastUpdated: b.metrics.lastUpdated,
  }));

  return Papa.unparse(flattenedData);
}
