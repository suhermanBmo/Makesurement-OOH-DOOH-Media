import { BillboardLocation } from '../types';

export interface GoogleSheetSyncResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
  rowCount: number;
}

/**
 * Creates a formatted Google Sheet in the user's Google Drive with all current billboard measurements
 */
export async function exportBillboardsToGoogleSheet(
  accessToken: string,
  billboards: BillboardLocation[],
  customTitle?: string
): Promise<GoogleSheetSyncResult> {
  const title =
    customTitle ||
    `Database Pengukuran Billboard Bandung - ${new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })}`;

  // 1. Create the spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title,
      },
      sheets: [
        {
          properties: {
            title: 'Data Telemetri Billboard',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      ],
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gagal membuat Google Sheet (${createRes.status})`);
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 2. Prepare headers and row values
  const headers = [
    'Kode Titik',
    'Nama Billboard',
    'Alamat Lokasi',
    'Kota',
    'Latitude',
    'Longitude',
    'Tipe Konstruksi',
    'Dimensi / Ukuran',
    'Arah Hadap Visual',
    'Kategori Jalan',
    'Tarif Bulanan (IDR)',
    'Klien Penyewa Aktif',
    'Jatuh Tempo Kontrak',
    'Status Operasional',
    'Volume Kendaraan (unit/jam)',
    'Pejalan Kaki (orang/jam)',
    'Pencahayaan (Lux)',
    'Tegangan Listrik (V)',
    'Arus Listrik (A)',
    'Konsumsi Daya (kW)',
    'Suhu Lingkungan (°C)',
    'Kelembapan Relatif (%)',
    'Getaran Struktur (mm/s)',
    'Kecepatan Angin (km/h)',
    'Layar Menyala (Aktif)',
    'Sinkronisasi Sensor Terakhir',
  ];

  const rows = billboards.map((b) => [
    b.code,
    b.name,
    b.address,
    b.city,
    b.coordinates.lat,
    b.coordinates.lng,
    b.type,
    b.dimensions,
    b.orientation,
    b.roadCategory,
    b.baseRateMonthly,
    b.currentClient || 'Tersedia (Vacant)',
    b.contractExpiry || '-',
    b.status,
    b.metrics.trafficVolume,
    b.metrics.pedestrianFlow,
    b.metrics.ambientLux,
    b.metrics.powerVoltage,
    b.metrics.powerCurrent,
    b.metrics.powerKw,
    b.metrics.temperature,
    b.metrics.humidity,
    b.metrics.structuralVibration,
    b.metrics.windSpeed,
    b.metrics.displayActive ? 'ON' : 'OFF',
    b.metrics.lastUpdated,
  ]);

  const allValues = [headers, ...rows];

  // 3. Write data to sheet
  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Data Telemetri Billboard'!A1:Z${allValues.length}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: `'Data Telemetri Billboard'!A1:Z${allValues.length}`,
        majorDimension: 'ROWS',
        values: allValues,
      }),
    }
  );

  if (!updateRes.ok) {
    const err = await updateRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gagal menulis data ke Google Sheet (${updateRes.status})`);
  }

  // 4. Polish sheet styling (Header background color in Bandung Media Outdoor theme)
  try {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.08, green: 0.18, blue: 0.36 }, // Navy blue
                  textFormat: {
                    bold: true,
                    foregroundColor: { red: 1.0, green: 1.0, blue: 1.0 },
                    fontSize: 10,
                  },
                  horizontalAlignment: 'CENTER',
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
            },
          },
          {
            autoResizeDimensions: {
              dimensions: {
                sheetId: 0,
                dimension: 'COLUMNS',
                startIndex: 0,
                endIndex: 26,
              },
            },
          },
        ],
      }),
    });
  } catch (e) {
    // Non-critical formatting error
    console.warn('Formatting sheet failed:', e);
  }

  return {
    spreadsheetId,
    spreadsheetUrl,
    title,
    rowCount: billboards.length,
  };
}

/**
 * Import billboard data from an existing Google Sheet ID
 */
export async function importBillboardsFromGoogleSheet(
  accessToken: string,
  spreadsheetId: string
): Promise<BillboardLocation[]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Data Telemetri Billboard'!A1:Z100`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gagal membaca Google Sheet (${res.status})`);
  }

  const data = await res.json();
  const rows: any[][] = data.values || [];

  if (rows.length < 2) {
    throw new Error('Google Sheet kosong atau tidak memiliki baris data');
  }

  const results: BillboardLocation[] = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[0]) continue;

    const code = String(r[0] || `BDO-${100 + i}`);
    const name = String(r[1] || `Billboard ${code}`);
    const address = String(r[2] || 'Bandung');
    const city = String(r[3] || 'Bandung');
    const lat = Number(r[4]) || -6.90389;
    const lng = Number(r[5]) || 107.61861;
    const type = r[6] || 'LED Megatron';
    const dimensions = r[7] || '8m x 16m';
    const orientation = r[8] || 'Facing North';
    const roadCategory = r[9] || 'Protokol Utama';
    const baseRateMonthly = Number(r[10]) || 45000000;
    const currentClient = r[11] === '-' || r[11] === 'Tersedia (Vacant)' ? null : r[11];
    const contractExpiry = r[12] === '-' ? null : r[12];
    const status = r[13] || 'Normal';

    const trafficVolume = Number(r[14]) || 3000;
    const pedestrianFlow = Number(r[15]) || 500;
    const ambientLux = Number(r[16]) || 1200;
    const powerVoltage = Number(r[17]) || 220;
    const powerCurrent = Number(r[18]) || 15;
    const powerKw = Number(r[19]) || 3.3;
    const temperature = Number(r[20]) || 27;
    const humidity = Number(r[21]) || 65;
    const structuralVibration = Number(r[22]) || 1.1;
    const windSpeed = Number(r[23]) || 12;
    const displayActive = r[24] !== 'OFF';
    const lastUpdated = r[25] || new Date().toISOString();

    results.push({
      id: `sheet-bb-${code.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      code,
      name,
      address,
      city,
      coordinates: { lat, lng },
      type: type as any,
      dimensions,
      orientation,
      roadCategory: roadCategory as any,
      baseRateMonthly,
      currentClient,
      contractExpiry,
      status: status as any,
      metrics: {
        trafficVolume,
        pedestrianFlow,
        ambientLux,
        powerVoltage,
        powerCurrent,
        powerKw,
        temperature,
        humidity,
        structuralVibration,
        windSpeed,
        displayActive,
        lastUpdated,
      },
      lastCsvSync: `Google Sheet Sync (${new Date().toLocaleTimeString('id-ID')})`,
    });
  }

  return results;
}
