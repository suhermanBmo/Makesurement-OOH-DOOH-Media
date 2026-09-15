import React, { useState, useMemo } from 'react';
import {
  BillboardLocation,
  CRMClient,
  ProposalRecord,
} from '../types';
import {
  FileText,
  Send,
  MessageSquare,
  Mail,
  Printer,
  Copy,
  Check,
  ExternalLink,
  MapPin,
  Calendar,
  Sparkles,
  Search,
  SlidersHorizontal,
  ChevronDown,
  Building,
  User,
  Phone,
  Layers,
  ArrowRight,
  TrendingUp,
  Clock,
  Eye,
  Percent,
  CheckCircle2,
  Trash2,
  Share2,
} from 'lucide-react';
import { useToast } from './Toast';
import { saveProposalToFirestore } from '../services/firestoreService';

interface ProposalGeneratorViewProps {
  billboards: BillboardLocation[];
  clients: CRMClient[];
  savedProposals?: ProposalRecord[];
  onSelectBillboardForMap?: (billboard: BillboardLocation) => void;
}

export const ProposalGeneratorView: React.FC<ProposalGeneratorViewProps> = ({
  billboards,
  clients,
  savedProposals = [],
  onSelectBillboardForMap,
}) => {
  const { showToast } = useToast();

  // --- Filtering & Selection ---
  const [filterMode, setFilterMode] = useState<'all_avail' | 'vacant_now' | 'avail_soon' | 'all'>('all_avail');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Selected Billboards configuration: { [billboardId]: { durationMonths: number, discountPercent: number } }
  const [selectedConfigs, setSelectedConfigs] = useState<
    Record<string, { durationMonths: number; discountPercent: number; customRate?: number }>
  >(() => {
    // Default select vacant & avail soon locations
    const initial: Record<string, { durationMonths: number; discountPercent: number }> = {};
    billboards
      .filter((b) => b.availStatus === 'Avail Sekarang' || b.availStatus === 'Avail Segera')
      .forEach((b) => {
        initial[b.id] = { durationMonths: 3, discountPercent: 5 };
      });
    return initial;
  });

  // Photo Lightbox modal
  const [activePhotoModal, setActivePhotoModal] = useState<{
    url: string;
    title: string;
    code: string;
  } | null>(null);

  // --- Client & Proposal Form State ---
  const [selectedPresetClient, setSelectedPresetClient] = useState<string>('');
  const [clientName, setClientName] = useState('PT Unilever Indonesia Tbk');
  const [clientBrand, setClientBrand] = useState('Pepsodent & Lifebuoy Regional Campaign');
  const [clientPic, setClientPic] = useState('Bpk. Dimas Wicaksono (Brand Manager)');
  const [clientPhone, setClientPhone] = useState('081223344550');
  const [clientEmail, setClientEmail] = useState('dimas.wicaksono@unilever.com');
  const [proposalNumber, setProposalNumber] = useState(
    `BMO/QUO/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(
      Math.floor(Math.random() * 899 + 100)
    )}`
  );
  const [proposalValidityDays, setProposalValidityDays] = useState(14);
  const [customNotes, setCustomNotes] = useState(
    'Paket penawaran sudah termasuk biaya pajak reklame 25%, asuransi all-risk konstruksi, dan pemeliharaan pencahayaan sensor telemetri 24 jam.'
  );

  // --- Output Tab: WhatsApp vs Email vs Formal PDF ---
  const [previewTab, setPreviewTab] = useState<'wa' | 'email' | 'formal'>('wa');
  const [isCopied, setIsCopied] = useState(false);
  const [isSendingDispatch, setIsSendingDispatch] = useState(false);
  const [recentSentList, setRecentSentList] = useState<ProposalRecord[]>(savedProposals);

  // Filtered Billboards
  const filteredBillboards = useMemo(() => {
    return billboards.filter((b) => {
      // Filter by availability
      if (filterMode === 'vacant_now' && b.availStatus !== 'Avail Sekarang') return false;
      if (filterMode === 'avail_soon' && b.availStatus !== 'Avail Segera') return false;
      if (
        filterMode === 'all_avail' &&
        b.availStatus !== 'Avail Sekarang' &&
        b.availStatus !== 'Avail Segera'
      )
        return false;

      // Filter by construction type
      if (typeFilter !== 'all' && b.type !== typeFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          b.name.toLowerCase().includes(q) ||
          b.code.toLowerCase().includes(q) ||
          b.address.toLowerCase().includes(q) ||
          b.roadCategory.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [billboards, filterMode, typeFilter, searchQuery]);

  // Handle Preset Client Change
  const handleSelectPresetClient = (clientId: string) => {
    setSelectedPresetClient(clientId);
    const found = clients.find((c) => c.id === clientId);
    if (found) {
      setClientName(found.companyName);
      setClientBrand(found.brand);
      setClientPic(found.contactPerson);
      setClientPhone(found.phone);
      setClientEmail(found.email);
      showToast('Data Klien Terisi', 'info', `Memuat data profil untuk ${found.companyName}`);
    }
  };

  // Toggle Billboard Selection
  const toggleSelectBillboard = (billboardId: string) => {
    setSelectedConfigs((prev) => {
      const next = { ...prev };
      if (next[billboardId]) {
        delete next[billboardId];
      } else {
        next[billboardId] = { durationMonths: 3, discountPercent: 5 };
      }
      return next;
    });
  };

  // Select All Avail / Clear All
  const handleSelectAllAvail = () => {
    const next: Record<string, { durationMonths: number; discountPercent: number }> = {};
    billboards
      .filter((b) => b.availStatus === 'Avail Sekarang' || b.availStatus === 'Avail Segera')
      .forEach((b) => {
        next[b.id] = { durationMonths: 3, discountPercent: 5 };
      });
    setSelectedConfigs(next);
    showToast('Semua Titik Avail Dipilih', 'success', `${Object.keys(next).length} titik ditambahkan ke penawaran`);
  };

  const handleClearAll = () => {
    setSelectedConfigs({});
    showToast('Pilihan Dikosongkan', 'info', 'Semua titik telah dihapus dari penawaran');
  };

  // Update Item Config
  const updateItemConfig = (
    billboardId: string,
    updates: Partial<{ durationMonths: number; discountPercent: number; customRate?: number }>
  ) => {
    setSelectedConfigs((prev) => ({
      ...prev,
      [billboardId]: {
        ...(prev[billboardId] || { durationMonths: 3, discountPercent: 5 }),
        ...updates,
      },
    }));
  };

  // Calculated items for proposal
  const selectedBillboardItems = useMemo(() => {
    const list: {
      billboard: BillboardLocation;
      durationMonths: number;
      discountPercent: number;
      ratePerMonth: number;
      totalNormal: number;
      totalDiscounted: number;
    }[] = [];

    Object.entries(selectedConfigs).forEach(([id, config]) => {
      const bb = billboards.find((b) => b.id === id);
      if (bb) {
        const ratePerMonth = config.customRate ?? bb.baseRateMonthly;
        const totalNormal = ratePerMonth * config.durationMonths;
        const discountAmount = totalNormal * (config.discountPercent / 100);
        const totalDiscounted = totalNormal - discountAmount;

        list.push({
          billboard: bb,
          durationMonths: config.durationMonths,
          discountPercent: config.discountPercent,
          ratePerMonth,
          totalNormal,
          totalDiscounted,
        });
      }
    });

    return list;
  }, [billboards, selectedConfigs]);

  // Aggregate Calculations
  const aggregateMetrics = useMemo(() => {
    const count = selectedBillboardItems.length;
    const totalDailyImpressions = selectedBillboardItems.reduce(
      (sum, item) => sum + (item.billboard.dailyImpressionsEstimate || 120000),
      0
    );
    const totalNormal = selectedBillboardItems.reduce((sum, item) => sum + item.totalNormal, 0);
    const totalDiscounted = selectedBillboardItems.reduce((sum, item) => sum + item.totalDiscounted, 0);
    const totalSavings = totalNormal - totalDiscounted;

    return {
      count,
      totalDailyImpressions,
      totalNormal,
      totalDiscounted,
      totalSavings,
    };
  }, [selectedBillboardItems]);

  // Clean phone for WhatsApp
  const cleanPhoneForWa = useMemo(() => {
    const raw = clientPhone.replace(/[^0-9]/g, '');
    if (raw.startsWith('0')) return '62' + raw.slice(1);
    return raw;
  }, [clientPhone]);

  // Build Formatted WhatsApp Message
  const generatedWaText = useMemo(() => {
    const validUntilDate = new Date();
    validUntilDate.setDate(validUntilDate.getDate() + proposalValidityDays);
    const validUntilFormatted = validUntilDate.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    let msg = `*PENAWARAN TITIK LOKASI BILLBOARD AVAIL (PRIME OUTDOOR)*\n`;
    msg += `*PT BANDUNG MEDIA OUTDOOR*\n`;
    msg += `No. Ref: _${proposalNumber}_\n`;
    msg += `-------------------------------------------\n\n`;
    msg += `Yth. *${clientPic || 'Pimpinan Brand / Media Planner'}*\n`;
    msg += `*${clientName}* (${clientBrand})\n\n`;
    msg += `Semoga Bapak/Ibu senantiasa dalam keadaan sehat dan sukses.\n\n`;
    msg += `Menindaklanjuti rencana penayangan media luar ruang (OOH), bersama ini kami sampaikan daftar *Lokasi Billboard Premium (Status Avail & Siap Tayang)* di koridor jalan utama Kota Bandung dengan visibilitas serta impresi trafik tertinggi:\n\n`;

    selectedBillboardItems.forEach((item, index) => {
      const bb = item.billboard;
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${bb.coordinates.lat},${bb.coordinates.lng}`;

      msg += `📍 *${index + 1}. ${bb.name} (${bb.code})*\n`;
      msg += `• *Status*: *${bb.availStatus?.toUpperCase() || 'AVAIL'}* (${bb.availDate || 'Siap Tayang'})\n`;
      msg += `• *Tipe Konstruksi*: ${bb.type}\n`;
      msg += `• *Ukuran / Dimensi*: ${bb.dimensions}\n`;
      msg += `• *Alamat*: ${bb.address}\n`;
      msg += `• *Arah Pandang*: ${bb.orientation}\n`;
      msg += `• *Klasifikasi Jalan*: ${bb.roadCategory}\n`;
      msg += `• *Estimasi Impresi*: ~${(bb.dailyImpressionsEstimate || 120000).toLocaleString(
        'id-ID'
      )} impresi / hari\n`;
      if (bb.highlights && bb.highlights.length > 0) {
        msg += `• *Keunggulan*: ${bb.highlights[0]}\n`;
      }
      msg += `• *Foto Ilustrasi & Mockup*: ${bb.photoUrl || '-'}\n`;
      msg += `• *Titik Google Maps*: ${mapsUrl}\n`;
      msg += `• *Periode Sewa*: ${item.durationMonths} Bulan\n`;
      msg += `• *Rate Sewa*: Rp ${(item.ratePerMonth / 1000000).toLocaleString('id-ID')} Jt /bulan`;
      if (item.discountPercent > 0) {
        msg += ` _(Diskon Khusus: ${item.discountPercent}%)_`;
      }
      msg += `\n`;
      msg += `• *Total Investasi Periode*: *Rp ${item.totalDiscounted.toLocaleString('id-ID')}*\n\n`;
    });

    msg += `-------------------------------------------\n`;
    msg += `*RINGKASAN TOTAL INVESTASI*\n`;
    msg += `• Total Unit Lokasi: *${aggregateMetrics.count} Titik Billboard*\n`;
    msg += `• Total Estimasi Impresi: *~${aggregateMetrics.totalDailyImpressions.toLocaleString(
      'id-ID'
    )} impresi / hari*\n`;
    if (aggregateMetrics.totalSavings > 0) {
      msg += `• Total Nilai Normal: ~Rp ${aggregateMetrics.totalNormal.toLocaleString('id-ID')}~\n`;
      msg += `• *Total Paket Khusus*: *Rp ${aggregateMetrics.totalDiscounted.toLocaleString('id-ID')}*\n`;
      msg += `• *Efisiensi Diskon*: Rp ${aggregateMetrics.totalSavings.toLocaleString('id-ID')}\n`;
    } else {
      msg += `• *Total Nilai Investasi*: *Rp ${aggregateMetrics.totalDiscounted.toLocaleString('id-ID')}*\n`;
    }
    msg += `-------------------------------------------\n\n`;
    msg += `📌 *Catatan & Ketentuan:*\n`;
    msg += `1. Penawaran ini berlaku hingga *${validUntilFormatted}*.\n`;
    msg += `2. ${customNotes}\n`;
    msg += `3. Ketersediaan titik sewaktu-waktu dapat berubah sebelum ada Surat Perintah Kerja (SPK) / konfirmasi booking resmi.\n\n`;
    msg += `Untuk negosiasi slot, site visit lokasi bersama, atau pertanyaan teknis, silakan langsung balas pesan ini atau hubungi marketing representatif kami.\n\n`;
    msg += `Hormat kami,\n`;
    msg += `*PT Bandung Media Outdoor*\n`;
    msg += `Divisi Pemasaran & Media Placement\n`;
    msg += `📧 suherman.reklame2012@gmail.com\n`;
    msg += `🌐 www.bandungmediaoutdoor.com`;

    return msg;
  }, [
    proposalNumber,
    clientPic,
    clientName,
    clientBrand,
    selectedBillboardItems,
    aggregateMetrics,
    proposalValidityDays,
    customNotes,
  ]);

  // Direct WhatsApp Web Trigger
  const handleOpenWaWeb = async () => {
    if (selectedBillboardItems.length === 0) {
      showToast('Pilih Titik Billboard', 'error', 'Silakan pilih minimal 1 titik billboard sebelum mengirim');
      return;
    }

    const encodedText = encodeURIComponent(generatedWaText);
    const waWebUrl = `https://web.whatsapp.com/send?phone=${cleanPhoneForWa}&text=${encodedText}`;

    // Record proposal to Firestore
    await handleSaveProposalRecord('whatsapp');

    // Open WhatsApp Web in new tab
    window.open(waWebUrl, '_blank', 'noopener,noreferrer');
    showToast('WhatsApp Web Dibuka', 'success', `Membuka ruang chat WhatsApp ke ${clientName}`);
  };

  // Direct wa.me Mobile Link
  const handleOpenWaMe = async () => {
    if (selectedBillboardItems.length === 0) {
      showToast('Pilih Titik Billboard', 'error', 'Silakan pilih minimal 1 titik billboard sebelum mengirim');
      return;
    }

    const encodedText = encodeURIComponent(generatedWaText);
    const waMeUrl = `https://wa.me/${cleanPhoneForWa}?text=${encodedText}`;

    await handleSaveProposalRecord('whatsapp');
    window.open(waMeUrl, '_blank', 'noopener,noreferrer');
    showToast('WhatsApp Mobile Dibuka', 'success', `Membuka tautan wa.me untuk ${clientName}`);
  };

  // Copy WhatsApp Text to Clipboard
  const handleCopyWaText = () => {
    navigator.clipboard.writeText(generatedWaText);
    setIsCopied(true);
    showToast('Teks Tersalin ke Clipboard', 'success', 'Format pesan WhatsApp penawaran siap di-paste');
    setTimeout(() => setIsCopied(false), 2500);
  };

  // Save proposal to Firestore & server dispatch
  const handleSaveProposalRecord = async (sentVia: 'whatsapp' | 'email' | 'both') => {
    const validUntilDate = new Date();
    validUntilDate.setDate(validUntilDate.getDate() + proposalValidityDays);

    const record: ProposalRecord = {
      id: `prop-${Date.now()}`,
      proposalNumber,
      clientName,
      clientBrand,
      clientPic,
      clientEmail,
      clientPhone,
      selectedBillboardIds: selectedBillboardItems.map((i) => i.billboard.id),
      itemConfigs: selectedConfigs,
      totalInvestment: aggregateMetrics.totalDiscounted,
      notes: customNotes,
      createdAt: new Date().toISOString(),
      validUntil: validUntilDate.toISOString(),
      sentVia,
      sentAt: new Date().toISOString(),
      status: 'sent',
    };

    try {
      await saveProposalToFirestore(record);
      setRecentSentList((prev) => [record, ...prev]);
    } catch (err) {
      console.warn('Could not save proposal to Firestore:', err);
    }
  };

  // Automated Email Dispatch (Server POST /api/proposals/dispatch)
  const handleDispatchEmail = async () => {
    if (selectedBillboardItems.length === 0) {
      showToast('Pilih Titik Billboard', 'error', 'Silakan pilih minimal 1 titik billboard');
      return;
    }

    setIsSendingDispatch(true);
    try {
      const response = await fetch('/api/proposals/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposal: {
            proposalNumber,
            clientName,
            clientBrand,
            clientPic,
            clientEmail,
            clientPhone,
            totalInvestment: aggregateMetrics.totalDiscounted,
          },
          channel: 'email',
          targetEmail: clientEmail,
          targetPhone: clientPhone,
          formattedText: generatedWaText,
        }),
      });

      const data = await response.json();
      if (data.success) {
        await handleSaveProposalRecord('email');
        showToast(
          'Email Penawaran Terkirim!',
          'success',
          `Surat penawaran ${proposalNumber} berhasil dikirim ke ${clientEmail}`
        );
      } else {
        throw new Error(data.error || 'Gagal mengirim email');
      }
    } catch (err: any) {
      console.error('Email dispatch error:', err);
      // Fallback to mailto link
      handleOpenMailto();
    } finally {
      setIsSendingDispatch(false);
    }
  };

  // Open Mail Client Fallback (mailto:)
  const handleOpenMailto = () => {
    const subject = encodeURIComponent(
      `[PENAWARAN RESMI] Rekomendasi Lokasi Billboard Avail Bandung - ${proposalNumber}`
    );
    const body = encodeURIComponent(generatedWaText);
    const mailtoUrl = `mailto:${clientEmail}?subject=${subject}&body=${body}`;
    window.location.href = mailtoUrl;
    showToast('Membuka Klien Email', 'info', `Menyiapkan draft email untuk ${clientEmail}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Top Banner & Introduction */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Sistem Otomatisasi Penawaran Media Luar Ruang (OOH)</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Generator Penawaran Titik Billboard Avail
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Kompilasi titik-titik billboard yang siap tayang (*Avail*) lengkap dengan foto ilustrasi
              mockup, spesifikasi teknis, data sensor telemetri trafik, dan hitungan estimasi impresi. Kirimkan
              penawaran secara instan via <strong>WhatsApp Web</strong> dan <strong>Email Klien</strong> dalam hitungan detik.
            </p>
          </div>

          {/* Aggregate Snapshot Card */}
          <div className="bg-slate-950/70 border border-slate-700/70 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-5 min-w-[320px] shadow-lg">
            <div className="text-center sm:text-left flex-1">
              <span className="text-xs text-slate-400 block font-medium">Titik Terpilih</span>
              <div className="text-2xl font-black text-amber-400 font-mono mt-0.5">
                {aggregateMetrics.count} <span className="text-xs font-normal text-slate-400">Unit Lokasi</span>
              </div>
              <div className="text-xs text-emerald-400 mt-1 font-semibold flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>~{aggregateMetrics.totalDailyImpressions.toLocaleString('id-ID')} Impresi/Hari</span>
              </div>
            </div>

            <div className="h-10 w-[1px] bg-slate-700 hidden sm:block" />

            <div className="text-center sm:text-left flex-1">
              <span className="text-xs text-slate-400 block font-medium">Total Investasi Paket</span>
              <div className="text-xl font-black text-white font-mono mt-0.5">
                Rp {(aggregateMetrics.totalDiscounted / 1000000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} Jt
              </div>
              {aggregateMetrics.totalSavings > 0 && (
                <span className="text-[11px] text-amber-400/90 font-medium block">
                  Hemat Rp {(aggregateMetrics.totalSavings / 1000000).toFixed(1)} Jt
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main 2-Column Workstation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Available Billboards Catalog & Selector (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Controls Bar: Filters & Selection Quick Actions */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-800/90 rounded-xl border border-slate-700/60 text-xs">
                <button
                  onClick={() => setFilterMode('all_avail')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                    filterMode === 'all_avail'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Semua Avail ({billboards.filter((b) => b.availStatus === 'Avail Sekarang' || b.availStatus === 'Avail Segera').length})
                </button>
                <button
                  onClick={() => setFilterMode('vacant_now')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                    filterMode === 'vacant_now'
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Avail Sekarang ({billboards.filter((b) => b.availStatus === 'Avail Sekarang').length})
                </button>
                <button
                  onClick={() => setFilterMode('avail_soon')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                    filterMode === 'avail_soon'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Avail Segera ({billboards.filter((b) => b.availStatus === 'Avail Segera').length})
                </button>
                <button
                  onClick={() => setFilterMode('all')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                    filterMode === 'all'
                      ? 'bg-slate-700 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Semua 12 Titik
                </button>
              </div>

              {/* Select / Deselect All */}
              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={handleSelectAllAvail}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30 font-medium transition"
                >
                  Pilih Semua Avail
                </button>
                <button
                  onClick={handleClearAll}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-700/60 font-medium transition"
                >
                  Hapus Pilihan
                </button>
              </div>
            </div>

            {/* Search & Construction Type Filter */}
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/80">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari jalan, nama billboard, atau kode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                aria-label="Filter Tipe Konstruksi"
                className="bg-slate-800/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="all">Semua Tipe Konstruksi</option>
                <option value="LED Megatron">LED Megatron</option>
                <option value="Digital Videotron">Digital Videotron</option>
                <option value="Static Frontlite">Static Frontlite</option>
                <option value="Bando Jalan">Bando Jalan</option>
                <option value="Prisma Display">Prisma Display</option>
              </select>
            </div>
          </div>

          {/* Billboards List */}
          <div className="space-y-4">
            {filteredBillboards.map((b) => {
              const isSelected = !!selectedConfigs[b.id];
              const config = selectedConfigs[b.id] || { durationMonths: 3, discountPercent: 5 };

              return (
                <div
                  key={b.id}
                  className={`rounded-2xl border transition-all overflow-hidden ${
                    isSelected
                      ? 'bg-slate-900 border-amber-500/80 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/40'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Card Main Row */}
                  <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 items-start">
                    {/* Checkbox Trigger */}
                    <button
                      onClick={() => toggleSelectBillboard(b.id)}
                      className={`mt-1 p-1 rounded-lg border transition ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-800 text-transparent border-slate-700 hover:border-slate-500'
                      }`}
                      title={isSelected ? 'Keluarkan dari penawaran' : 'Masukkan ke dalam penawaran'}
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                    </button>

                    {/* Image / Illustration with Lightbox Zoom Trigger */}
                    <div className="relative w-full sm:w-44 h-32 rounded-xl overflow-hidden bg-slate-800 flex-shrink-0 group cursor-pointer">
                      <img
                        src={b.photoUrl || (b.photos && b.photos[0])}
                        alt={b.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onClick={() =>
                          setActivePhotoModal({
                            url: b.photoUrl || (b.photos && b.photos[0]) || '',
                            title: b.name,
                            code: b.code,
                          })
                        }
                      />
                      <div
                        onClick={() =>
                          setActivePhotoModal({
                            url: b.photoUrl || (b.photos && b.photos[0]) || '',
                            title: b.name,
                            code: b.code,
                          })
                        }
                        className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white text-xs font-semibold"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Perbesar Foto</span>
                      </div>

                      {/* Construction Type Badge */}
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-950/80 text-white backdrop-blur-sm border border-slate-700">
                        {b.type}
                      </span>
                    </div>

                    {/* Content Details */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                            {b.code}
                          </span>
                          {/* Avail Status Badge */}
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              b.availStatus === 'Avail Sekarang'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse'
                                : b.availStatus === 'Avail Segera'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {b.availStatus || b.status}
                          </span>
                        </div>

                        {/* Rate Card per Month */}
                        <div className="text-right">
                          <span className="text-xs text-slate-400 block font-normal">Tarif Referensi</span>
                          <span className="text-sm font-bold text-amber-400 font-mono">
                            Rp {(b.baseRateMonthly / 1000000).toLocaleString('id-ID')} Jt /bln
                          </span>
                        </div>
                      </div>

                      <h3 className="text-base font-bold text-white leading-snug">{b.name}</h3>

                      <p className="text-xs text-slate-400 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                        <span className="truncate">{b.address}</span>
                      </p>

                      {/* Technical Specs Tags */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300 pt-1">
                        <span className="text-slate-400">
                          Dimensi: <strong className="text-slate-200">{b.dimensions}</strong>
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-400">
                          Jalan: <strong className="text-slate-200">{b.roadCategory}</strong>
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-400">
                          Trafik: <strong className="text-cyan-400 font-mono">{b.metrics.trafficVolume.toLocaleString('id-ID')} kend/jam</strong>
                        </span>
                      </div>

                      {/* Orientation */}
                      <p className="text-[11px] text-slate-400 italic">
                        Orientasi: {b.orientation}
                      </p>

                      {/* Highlighting USPs */}
                      {b.highlights && b.highlights.length > 0 && (
                        <div className="pt-1">
                          <span className="inline-block text-[11px] px-2.5 py-0.5 rounded-md bg-slate-800/80 text-emerald-300 border border-slate-700">
                            ✨ {b.highlights[0]}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Config & Calculation Sub-strip (If Selected) */}
                  {isSelected && (
                    <div className="bg-slate-950/60 border-t border-slate-800 px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                      {/* Duration & Discount Controls */}
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 font-medium">Periode Sewa:</span>
                          <select
                            value={config.durationMonths}
                            onChange={(e) =>
                              updateItemConfig(b.id, { durationMonths: Number(e.target.value) })
                            }
                            aria-label="Pilih Periode Sewa"
                            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-semibold text-white focus:outline-none focus:border-amber-500"
                          >
                            <option value={1}>1 Bulan</option>
                            <option value={3}>3 Bulan (Paket Q)</option>
                            <option value={6}>6 Bulan (Paket Semester)</option>
                            <option value={12}>12 Bulan (Paket Tahunan)</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 font-medium">Diskon Khusus:</span>
                          <select
                            value={config.discountPercent}
                            onChange={(e) =>
                              updateItemConfig(b.id, { discountPercent: Number(e.target.value) })
                            }
                            aria-label="Pilih Diskon Khusus"
                            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-semibold text-white focus:outline-none focus:border-amber-500"
                          >
                            <option value={0}>0% (Normal)</option>
                            <option value={5}>5% (Diskon Klien)</option>
                            <option value={10}>10% (Promo Periode)</option>
                            <option value={15}>15% (Diskon Tahunan)</option>
                            <option value={20}>20% (Kemitraan Khusus)</option>
                          </select>
                        </div>
                      </div>

                      {/* Subtotal Calculation */}
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[11px] text-slate-400 block">Subtotal Paket:</span>
                          <span className="font-mono text-sm font-bold text-amber-400">
                            Rp {(
                              b.baseRateMonthly *
                              config.durationMonths *
                              (1 - config.discountPercent / 100)
                            ).toLocaleString('id-ID')}
                          </span>
                        </div>

                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${b.coordinates.lat},${b.coordinates.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-cyan-400 hover:bg-slate-700 transition"
                          title="Buka titik koordinat di Google Maps"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Client Customizer & Automated Dispatch Center (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Client Profiling Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Target Calon Klien
                </h3>
              </div>

              {/* Fast autofill from CRM */}
              <select
                value={selectedPresetClient}
                onChange={(e) => handleSelectPresetClient(e.target.value)}
                aria-label="Pilih Cepat dari Database CRM"
                className="bg-slate-800 text-[11px] text-slate-300 border border-slate-700 rounded-lg px-2.5 py-1 focus:outline-none focus:border-amber-500"
              >
                <option value="">-- Pilih dari Database CRM --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName} ({c.brand})
                  </option>
                ))}
              </select>
            </div>

            {/* Inputs Grid */}
            <div className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-400 font-medium block mb-1">Nama Perusahaan / Instansi</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. PT Unilever Indonesia Tbk"
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-medium block mb-1">Brand / Produk Kampanye</label>
                  <input
                    type="text"
                    value={clientBrand}
                    onChange={(e) => setClientBrand(e.target.value)}
                    placeholder="e.g. Pepsodent Indonesia"
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-medium block mb-1">Nama Kontak PIC</label>
                  <input
                    type="text"
                    value={clientPic}
                    onChange={(e) => setClientPic(e.target.value)}
                    placeholder="e.g. Bpk. Dimas Wicaksono"
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-medium block mb-1 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-emerald-400" />
                    <span>WhatsApp / HP Klien</span>
                  </label>
                  <input
                    type="text"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="081223344550"
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-medium block mb-1 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-cyan-400" />
                    <span>Email Klien</span>
                  </label>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="dimas@unilever.com"
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-medium block mb-1">No. Penawaran Resmi</label>
                  <input
                    type="text"
                    value={proposalNumber}
                    onChange={(e) => setProposalNumber(e.target.value)}
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-amber-300 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-medium block mb-1">Masa Berlaku (Hari)</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={proposalValidityDays}
                    onChange={(e) => setProposalValidityDays(Number(e.target.value))}
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-medium block mb-1">Catatan & Ketentuan Penawaran</label>
                <textarea
                  rows={2}
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Automated Dispatch Actions Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-400" />
                <span>Saluran Automasi Pengiriman</span>
              </h3>

              {/* Switch View Mode */}
              <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl text-xs">
                <button
                  onClick={() => setPreviewTab('wa')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    previewTab === 'wa' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  WhatsApp
                </button>
                <button
                  onClick={() => setPreviewTab('email')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    previewTab === 'email' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Email
                </button>
                <button
                  onClick={() => setPreviewTab('formal')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    previewTab === 'formal' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Surat Resmi
                </button>
              </div>
            </div>

            {/* Action Buttons Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Button 1: WhatsApp Web Auto Dispatch */}
              <button
                onClick={handleOpenWaWeb}
                className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Kirim via WA Web</span>
              </button>

              {/* Button 2: Email Auto Dispatch */}
              <button
                onClick={handleDispatchEmail}
                disabled={isSendingDispatch}
                className="py-3 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-white font-bold text-xs shadow-lg shadow-cyan-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Mail className="w-4 h-4" />
                <span>{isSendingDispatch ? 'Memproses...' : 'Kirim Email Penawaran'}</span>
              </button>
            </div>

            {/* Secondary Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-xs">
              <button
                onClick={handleCopyWaText}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Tersalin!' : 'Salin Teks WA'}</span>
              </button>

              <button
                onClick={handleOpenWaMe}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 transition"
                title="Buka via link wa.me langsung"
              >
                <span>Buka wa.me</span>
                <ExternalLink className="w-3 h-3" />
              </button>

              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 transition"
                title="Cetak format proposal PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak / PDF</span>
              </button>
            </div>

            {/* Live Message Preview Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Pratinjau Pesan yang Akan Dikirim:</span>
                <span className="font-mono text-[11px] text-emerald-400">
                  {cleanPhoneForWa ? `+${cleanPhoneForWa}` : 'Belum ada nomor'}
                </span>
              </div>

              {previewTab === 'wa' && (
                <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 max-h-72 overflow-y-auto text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed shadow-inner">
                  {generatedWaText}
                </div>
              )}

              {previewTab === 'email' && (
                <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 max-h-72 overflow-y-auto text-xs text-slate-300 space-y-3">
                  <div className="border-b border-slate-800 pb-2 space-y-1">
                    <p className="text-slate-400">
                      Kepada: <strong className="text-white">{clientEmail}</strong>
                    </p>
                    <p className="text-slate-400">
                      Subject:{' '}
                      <strong className="text-amber-400">
                        [PENAWARAN RESMI] Rekomendasi Titik Billboard Avail Bandung - {proposalNumber}
                      </strong>
                    </p>
                  </div>
                  <div className="font-mono whitespace-pre-wrap leading-relaxed">
                    {generatedWaText}
                  </div>
                </div>
              )}

              {previewTab === 'formal' && (
                <div className="bg-white text-slate-900 rounded-2xl p-4 max-h-72 overflow-y-auto text-xs space-y-3 font-sans shadow-lg">
                  <div className="border-b-2 border-slate-900 pb-2 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-950">PT BANDUNG MEDIA OUTDOOR</h4>
                      <p className="text-[10px] text-slate-600">Jl. Ir. H. Djuanda No. 102, Bandung • 022-2501234</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-500 block">SURAT PENAWARAN</span>
                      <span className="font-mono font-bold text-[11px] text-slate-900">{proposalNumber}</span>
                    </div>
                  </div>

                  <p className="text-xs">
                    Kepada Yth. <br />
                    <strong>{clientPic}</strong> <br />
                    {clientName} ({clientBrand})
                  </p>

                  <div className="space-y-1.5 text-[11px]">
                    <p className="font-semibold text-slate-800">Daftar Titik Reklame Avail Rekomendasi:</p>
                    {selectedBillboardItems.map((item, i) => (
                      <div key={item.billboard.id} className="p-2 bg-slate-50 rounded border border-slate-200">
                        <p className="font-bold text-slate-900">
                          {i + 1}. {item.billboard.name} ({item.billboard.code})
                        </p>
                        <p className="text-slate-600">
                          {item.billboard.type} • {item.billboard.dimensions} • {item.durationMonths} Bulan
                        </p>
                        <p className="font-bold text-amber-700">
                          Investasi: Rp {item.totalDiscounted.toLocaleString('id-ID')}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-300 flex justify-between font-bold text-xs">
                    <span>Total Investasi Paket:</span>
                    <span>Rp {aggregateMetrics.totalDiscounted.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Full Resolution Photo Lightbox Modal */}
      {activePhotoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4"
          onClick={() => setActivePhotoModal(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl space-y-4 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-2">
              <div>
                <span className="text-xs font-mono font-bold text-amber-400 px-2 py-0.5 rounded bg-slate-800">
                  {activePhotoModal.code}
                </span>
                <h3 className="text-base font-bold text-white mt-1">{activePhotoModal.title}</h3>
              </div>
              <button
                onClick={() => setActivePhotoModal(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-xs font-semibold"
              >
                Tutup [ESC]
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden max-h-[70vh] bg-black flex items-center justify-center">
              <img
                src={activePhotoModal.url}
                alt={activePhotoModal.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain max-h-[70vh]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
