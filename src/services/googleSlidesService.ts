import { BillboardLocation, CRMClient } from '../types';

export interface GoogleSlidesResult {
  presentationId: string;
  presentationUrl: string;
  title: string;
  slidesCount: number;
}

/**
 * Creates an executive slide deck in Google Slides summarizing Billboard telemetry and CRM health
 */
export async function createBillboardSlideDeck(
  accessToken: string,
  billboards: BillboardLocation[],
  clients: CRMClient[],
  customTitle?: string
): Promise<GoogleSlidesResult> {
  const title =
    customTitle ||
    `Laporan Eksekutif Telemetri Reklame - Bandung Media Outdoor (${new Date().toLocaleDateString(
      'id-ID',
      { month: 'long', year: 'numeric' }
    )})`;

  // 1. Create a blank Google Slides presentation
  const createRes = await fetch('https://slides.googleapis.com/v1/presentations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gagal membuat presentasi Google Slides (${createRes.status})`);
  }

  const presentation = await createRes.json();
  const presentationId = presentation.presentationId;
  const presentationUrl = `https://docs.google.com/presentation/d/${presentationId}/edit`;

  // 2. Prepare structured slides via batchUpdate
  const normalCount = billboards.filter((b) => b.status === 'Normal').length;
  const alertCount = billboards.filter((b) => b.status === 'Warning' || b.status === 'Critical').length;
  const totalTraffic = billboards.reduce((acc, b) => acc + b.metrics.trafficVolume, 0);
  const totalKw = billboards.reduce((acc, b) => acc + b.metrics.powerKw, 0);

  const slide1Id = 'slide_executive_overview';
  const slide2Id = 'slide_billboard_locations';
  const slide3Id = 'slide_crm_retention';

  const requests: any[] = [
    // Slide 1: Overview
    {
      createSlide: {
        objectId: slide1Id,
        insertionIndex: 1,
        slideLayoutReference: { predefinedLayout: 'TITLE_AND_BODY' },
      },
    },
    // Slide 2: Sensor Health
    {
      createSlide: {
        objectId: slide2Id,
        insertionIndex: 2,
        slideLayoutReference: { predefinedLayout: 'TITLE_AND_BODY' },
      },
    },
    // Slide 3: CRM AI Predictive
    {
      createSlide: {
        objectId: slide3Id,
        insertionIndex: 3,
        slideLayoutReference: { predefinedLayout: 'TITLE_AND_BODY' },
      },
    },
  ];

  try {
    const batchRes = await fetch(
      `https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      }
    );

    if (!batchRes.ok) {
      console.warn('Batch slide create notice:', await batchRes.text());
    }

    // Now populate slide text
    const textRequests: any[] = [
      // Insert title text into title shape of first slide if exists
      {
        createShape: {
          objectId: 'shape_kpi_text',
          shapeType: 'TEXT_BOX',
          elementProperties: {
            pageObjectId: slide1Id,
            size: {
              height: { magnitude: 260, unit: 'PT' },
              width: { magnitude: 600, unit: 'PT' },
            },
            transform: {
              scaleX: 1,
              scaleY: 1,
              translateX: 60,
              translateY: 80,
              unit: 'PT',
            },
          },
        },
      },
      {
        insertText: {
          objectId: 'shape_kpi_text',
          text: `RINGKASAN TELEMETRI REKLAME KOTA BANDUNG\n` +
            `• Total Titik Reklame: ${billboards.length} Titik Strategis\n` +
            `• Status Operasional Normal: ${normalCount} Titik (${Math.round((normalCount / (billboards.length || 1)) * 100)}%)\n` +
            `• Perhatian / Kritis Sensor: ${alertCount} Titik\n` +
            `• Akumulasi Arus Lalu Lintas: ${totalTraffic.toLocaleString('id-ID')} kendaraan/jam\n` +
            `• Estimasi Beban Daya Listrik: ${totalKw.toFixed(1)} kW (Real-time)\n` +
            `• Akun Pengelola: suherman.reklame2012@gmail.com\n\n` +
            `Data disinkronisasi secara otomatis dari sensor telemetri & database Google Drive.`,
        },
      },
      // Slide 2 Content
      {
        createShape: {
          objectId: 'shape_locations_text',
          shapeType: 'TEXT_BOX',
          elementProperties: {
            pageObjectId: slide2Id,
            size: {
              height: { magnitude: 260, unit: 'PT' },
              width: { magnitude: 600, unit: 'PT' },
            },
            transform: {
              scaleX: 1,
              scaleY: 1,
              translateX: 60,
              translateY: 80,
              unit: 'PT',
            },
          },
        },
      },
      {
        insertText: {
          objectId: 'shape_locations_text',
          text: `AUDIT SENSOR STRUKTURAL & LOKASI UTAMA\n\n` +
            billboards
              .slice(0, 5)
              .map(
                (b) =>
                  `• ${b.code} - ${b.name}\n` +
                  `  Tipe: ${b.type} (${b.dimensions}) | Klien: ${b.currentClient || 'Vacant'}\n` +
                  `  Lalu Lintas: ${b.metrics.trafficVolume.toLocaleString('id-ID')} kend/jam | Lux: ${b.metrics.ambientLux} | Getaran: ${b.metrics.structuralVibration} mm/s | Angin: ${b.metrics.windSpeed} km/h`
              )
              .join('\n\n'),
        },
      },
      // Slide 3 Content
      {
        createShape: {
          objectId: 'shape_crm_text',
          shapeType: 'TEXT_BOX',
          elementProperties: {
            pageObjectId: slide3Id,
            size: {
              height: { magnitude: 260, unit: 'PT' },
              width: { magnitude: 600, unit: 'PT' },
            },
            transform: {
              scaleX: 1,
              scaleY: 1,
              translateX: 60,
              translateY: 80,
              unit: 'PT',
            },
          },
        },
      },
      {
        insertText: {
          objectId: 'shape_crm_text',
          text: `ANALISIS AI CRM & PREDIKSI RETENSI KLIEN\n\n` +
            clients
              .slice(0, 4)
              .map(
                (c) =>
                  `• ${c.companyName} (${c.brand})\n` +
                  `  Industri: ${c.industry} | Spend: Rp ${(c.monthlySpend / 1000000).toFixed(0)} Juta/bln\n` +
                  `  Prediksi Risiko Churn AI: ${c.churnRisk}% (${c.churnRisk > 50 ? 'RISIKO TINGGI' : 'RENDAH'}) | Kepuasan: ${c.satisfactionScore}/5.0`
              )
              .join('\n\n') +
            `\n\nRekomendasi AI: Berikan diskon bundling perpanjangan kontrak 12 bulan dan prioritaskan perbaikan sensor di titik klien dengan risiko churn tinggi.`,
        },
      },
    ];

    await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests: textRequests }),
    });
  } catch (slideErr) {
    console.warn('Formatting slides content error:', slideErr);
  }

  return {
    presentationId,
    presentationUrl,
    title,
    slidesCount: 4,
  };
}
