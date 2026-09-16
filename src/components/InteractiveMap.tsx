import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import {
  BillboardLocation,
  BillboardType,
  BillboardStatus,
  SensorThresholdConfig,
} from '../types';
import {
  Layers,
  Activity,
  Zap,
  Sun,
  Wind,
  Vibrate,
  Eye,
  AlertTriangle,
  CheckCircle,
  Building,
  Navigation,
  Sparkles,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  RotateCcw,
  ShieldCheck,
  MapPin,
  Compass,
  Flame,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  loadLeafletHeat,
  createTrafficHeatLayer,
  generateTrafficCorridorHeatPoints,
  TRAFFIC_HEATMAP_GRADIENT,
  DEFAULT_HEATMAP_CONFIG,
  RealtimeTrafficHeatLayer,
} from '../utils/heatmapHelper';

interface InteractiveMapProps {
  billboards: BillboardLocation[];
  selectedBillboard: BillboardLocation | null;
  onSelectBillboard: (b: BillboardLocation) => void;
  onOpenDetailModal?: (b: BillboardLocation) => void;
  thresholds: SensorThresholdConfig;
  onRunAiForBillboard?: (b: BillboardLocation) => void;
  onOpenAiHealer?: () => void;
  onTriggerAiFix?: () => void;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  billboards,
  selectedBillboard,
  onSelectBillboard,
  onOpenDetailModal,
  thresholds,
  onRunAiForBillboard,
  onOpenAiHealer,
  onTriggerAiFix,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [id: string]: L.Marker }>({});
  const circlesRef = useRef<L.Circle[]>([]);
  const heatLayerRef = useRef<any>(null);
  const hotspotHalosRef = useRef<L.Circle[]>([]);

  // Filter states
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showTrafficRings, setShowTrafficRings] = useState<boolean>(false);
  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite' | 'dark'>('streets');

  // Heatmap Overlay states
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [heatmapMetric, setHeatmapMetric] = useState<'trafficVolume' | 'dailyReach'>('trafficVolume');
  const [heatmapRadius, setHeatmapRadius] = useState<number>(40);
  const [heatmapBlur, setHeatmapBlur] = useState<number>(26);
  const [heatmapOpacity, setHeatmapOpacity] = useState<number>(0.75);
  const [isHeatConfigOpen, setIsHeatConfigOpen] = useState<boolean>(false);
  const [isHeatPluginReady, setIsHeatPluginReady] = useState<boolean>(false);

  const getHeatmapMetricValue = useCallback(
    (b: BillboardLocation): number => {
      if (heatmapMetric === 'trafficVolume') {
        return b.metrics.trafficVolume;
      }
      return Math.round(b.metrics.trafficVolume * 14.5 + (b.metrics.pedestrianFlow || 0) * 10);
    },
    [heatmapMetric]
  );

  // Filtered billboard list
  const filteredBillboards = billboards.filter((b) => {
    const matchesType = typeFilter === 'ALL' || b.type === typeFilter;
    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
    const matchesQuery =
      searchQuery === '' ||
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.currentClient && b.currentClient.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesStatus && matchesQuery;
  });

  // Top traffic density hotspots
  const topHotspots = [...billboards]
    .sort((a, b) => b.metrics.trafficVolume - a.metrics.trafficVolume)
    .slice(0, 3);

  // City-wide real-time traffic aggregate
  const totalCityTraffic = billboards.reduce((acc, b) => acc + b.metrics.trafficVolume, 0);
  const avgCityTraffic = billboards.length ? Math.round(totalCityTraffic / billboards.length) : 0;

  // Real-time Critical billboards for operator priority triage
  const criticalBillboards = filteredBillboards.filter((b) => b.status === 'Critical');

  // Load leaflet.heat plugin asynchronously
  useEffect(() => {
    loadLeafletHeat().then((ready) => {
      setIsHeatPluginReady(ready);
    });
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Center Bandung coordinates: lat -6.90389, lng 107.61861
    const map = L.map(mapContainerRef.current, {
      center: [-6.9105, 107.615],
      zoom: 13,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Default tile layer (OpenStreetMap Standard - 100% Free, No Watermark, No API Key Required)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> kontributor',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    // Invalidate map size once rendered to prevent 0-height canvas calculation
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      clearTimeout(timer);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (heatLayerRef.current && mapInstanceRef.current) {
        try {
          mapInstanceRef.current.removeLayer(heatLayerRef.current);
        } catch {
          // ignore
        }
        heatLayerRef.current = null;
      }
      hotspotHalosRef.current.forEach((halo) => {
        try {
          mapInstanceRef.current?.removeLayer(halo);
        } catch {
          // ignore
        }
      });
      hotspotHalosRef.current = [];
      try {
        map.remove();
      } catch {
        // ignore
      }
      mapInstanceRef.current = null;
    };
  }, []);

  // Synchronize Heatmap Layer with current sensor telemetry and settings
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove existing halo rings
    hotspotHalosRef.current.forEach((halo) => {
      try {
        map.removeLayer(halo);
      } catch {
        // ignore
      }
    });
    hotspotHalosRef.current = [];

    if (!showHeatmap) {
      if (heatLayerRef.current) {
        try {
          map.removeLayer(heatLayerRef.current);
        } catch {
          // ignore
        }
        heatLayerRef.current = null;
      }
      return;
    }

    // Determine max values for scaling
    const metricValues = filteredBillboards.map((b) => getHeatmapMetricValue(b));
    const maxVal = Math.max(...metricValues, 1000);

    // Format real-time heat points with corridor dispersion for authentic traffic flow density
    const heatPoints = generateTrafficCorridorHeatPoints(filteredBillboards, heatmapMetric, maxVal);

    // Add high-density halo rings around top 3 hotspots for extra visual clarity
    const sortedByDensity = [...filteredBillboards].sort((a, b) => {
      const va = getHeatmapMetricValue(a);
      const vb = getHeatmapMetricValue(b);
      return vb - va;
    });

    sortedByDensity.slice(0, 3).forEach((topB, idx) => {
      const haloColor = idx === 0 ? '#ef4444' : idx === 1 ? '#f97316' : '#facc15';
      try {
        const halo = L.circle([topB.coordinates.lat, topB.coordinates.lng], {
          radius: idx === 0 ? 380 : idx === 1 ? 310 : 250,
          color: haloColor,
          weight: 2,
          dashArray: '4, 6',
          fillColor: haloColor,
          fillOpacity: 0.18,
        }).addTo(map);
        hotspotHalosRef.current.push(halo);
      } catch {
        // ignore
      }
    });

    // Safety check: Ensure map container has non-zero dimensions before creating or redrawing heatLayer
    const mapSize = map.getSize();
    if (!mapSize || mapSize.x <= 0 || mapSize.y <= 0) {
      // Defer rendering until container is properly sized
      const onResize = () => {
        const currentSize = map.getSize();
        if (currentSize && currentSize.x > 0 && currentSize.y > 0) {
          map.off('resize', onResize);
          if (heatLayerRef.current) {
            try {
              heatLayerRef.current.redraw();
            } catch {
              // ignore
            }
          }
        }
      };
      map.on('resize', onResize);
      return;
    }

    // Create or update Realtime Traffic HeatLayer
    try {
      if (!heatLayerRef.current) {
        heatLayerRef.current = createTrafficHeatLayer(heatPoints, {
          radius: heatmapRadius,
          blur: heatmapBlur,
          maxZoom: 17,
          max: 1.0,
          minOpacity: heatmapOpacity,
          gradient: TRAFFIC_HEATMAP_GRADIENT,
        }).addTo(map);
      } else {
        heatLayerRef.current.setLatLngs(heatPoints);
        heatLayerRef.current.setOptions({
          radius: heatmapRadius,
          blur: heatmapBlur,
          minOpacity: heatmapOpacity,
          gradient: TRAFFIC_HEATMAP_GRADIENT,
        });
        heatLayerRef.current.redraw();
      }
    } catch (err) {
      console.warn('Realtime Traffic HeatLayer safe catch:', err);
    }
  }, [
    isHeatPluginReady,
    showHeatmap,
    filteredBillboards,
    heatmapMetric,
    heatmapRadius,
    heatmapBlur,
    heatmapOpacity,
  ]);

  // Update Tile Layers when mapStyle changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove existing tile layer
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    let tileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
    let attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> kontributor';

    if (mapStyle === 'dark') {
      tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
      attribution = 'Tiles &copy; Esri &mdash; DeLorme, NAVTEQ';
    } else if (mapStyle === 'satellite') {
      tileUrl =
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      attribution = 'Tiles &copy; Esri &mdash; Maxar, Earthstar Geographics';
    }

    L.tileLayer(tileUrl, {
      attribution,
      maxZoom: 19,
    }).addTo(map);
  }, [mapStyle]);

  // Update Markers & Traffic Density Circles
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old markers & circles
    Object.values(markersRef.current).forEach((m) => map.removeLayer(m));
    markersRef.current = {};

    circlesRef.current.forEach((c) => map.removeLayer(c));
    circlesRef.current = [];

    filteredBillboards.forEach((b) => {
      const isSelected = selectedBillboard?.id === b.id;
      const isCritical = b.status === 'Critical';
      const isWarning = !isCritical && b.status === 'Warning';

      // Status color map
      let color = '#10b981'; // normal (emerald)
      let badge = 'NORMAL';

      if (isCritical) {
        color = '#ef4444'; // critical (red)
        badge = 'KRITIS';
      } else if (isWarning) {
        color = '#f59e0b'; // warning (amber)
        badge = 'WASPADA';
      } else if (b.status === 'Vacant') {
        color = '#64748b'; // vacant (slate)
        badge = 'KOSONG';
      }

      // Real-time Traffic density color indicator
      const trafficColor =
        b.metrics.trafficVolume > 6500
          ? '#ef4444' // red
          : b.metrics.trafficVolume > 5000
          ? '#f97316' // orange
          : b.metrics.trafficVolume > 3500
          ? '#eab308' // yellow
          : '#10b981'; // emerald

      // Custom SVG Pin Icon with live traffic badge & Critical Radar Pulse
      const customIconHtml = `
        <div class="relative flex flex-col items-center justify-center cursor-pointer group" style="width: ${isCritical ? '74px' : '54px'}; height: ${isCritical ? '74px' : '54px'};">
          <!-- Critical Status Radiating Sonar Waves -->
          ${
            isCritical
              ? `
              <div class="absolute w-12 h-12 rounded-full border-2 border-rose-500 bg-rose-600/35 critical-sonar-ring-1 pointer-events-none"></div>
              <div class="absolute w-12 h-12 rounded-full border-2 border-rose-500 bg-rose-600/25 critical-sonar-ring-2 pointer-events-none"></div>
              <div class="absolute w-12 h-12 rounded-full border-2 border-rose-500 bg-rose-600/20 critical-sonar-ring-3 pointer-events-none"></div>
              `
              : isWarning
              ? `<div class="absolute inset-1 rounded-full animate-ping opacity-60 bg-amber-500"></div>`
              : ''
          }

          <!-- Emergency Alert Banner / Traffic Badge -->
          ${
            isCritical
              ? `
              <div class="absolute -top-5 z-30 px-2 py-0.5 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white font-mono font-black text-[9px] shadow-2xl border-2 border-white flex items-center gap-1 animate-bounce pointer-events-none whitespace-nowrap">
                <span class="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                <span>ALERT KRITIS</span>
              </div>
              `
              : `
              <div class="absolute -top-3.5 z-20 px-1.5 py-0.5 rounded-full bg-slate-950/95 text-[9px] font-mono font-bold text-white shadow-lg border border-slate-700 flex items-center gap-1 whitespace-nowrap pointer-events-none">
                <span class="w-1.5 h-1.5 rounded-full animate-pulse" style="background-color: ${trafficColor};"></span>
                <span style="color: ${trafficColor};">${b.metrics.trafficVolume.toLocaleString()}</span>
                <span class="text-[7.5px] text-slate-400 font-normal">/j</span>
              </div>
              `
          }

          <!-- Central Pin Core -->
          <div class="w-10 h-10 rounded-2xl shadow-xl flex items-center justify-center transition-transform transform ${
            isCritical
              ? 'critical-marker-core critical-border-strobe ring-4 ring-rose-500 ring-offset-2 ring-offset-slate-950 scale-110'
              : isSelected
              ? 'scale-125 ring-4 ring-white'
              : 'group-hover:scale-110'
          }" style="background: ${
            isCritical
              ? 'linear-gradient(135deg, #ef4444, #7f1d1d)'
              : `linear-gradient(135deg, ${color}, #0f172a)`
          }; border: 2.5px solid white;">
            ${
              isCritical
                ? `
                <svg class="w-5 h-5 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                `
                : `
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
                `
            }
          </div>

          <!-- Code Tag -->
          <div class="absolute -bottom-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold text-white shadow" style="background-color: ${
            isCritical ? '#dc2626' : color
          };">
            ${b.code.split('-')[1]}
          </div>
        </div>
      `;

      const iconDimension = isCritical ? 74 : 54;
      const customIcon = L.divIcon({
        html: customIconHtml,
        className: 'custom-billboard-marker',
        iconSize: [iconDimension, iconDimension],
        iconAnchor: [iconDimension / 2, iconDimension / 2],
      });

      const marker = L.marker([b.coordinates.lat, b.coordinates.lng], {
        icon: customIcon,
        title: isCritical ? `[KRITIS] ${b.name}` : b.name,
      }).addTo(map);

      // Boost Critical markers so they always float above other pins
      marker.setZIndexOffset(isCritical ? 3000 : isSelected ? 1500 : 0);

      // Popup content
      const popupHtml = `
        <div class="p-1 font-sans text-slate-900 min-w-[250px]">
          <div class="flex items-center justify-between gap-2 border-b pb-1.5 mb-2">
            <span class="text-xs font-bold font-mono text-slate-600">${b.code}</span>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold text-white flex items-center gap-1 ${
              isCritical ? 'bg-rose-600 animate-pulse' : ''
            }" style="${!isCritical ? `background-color: ${color};` : ''}">
              ${isCritical ? '⚠️ STATUS KRITIS' : badge}
            </span>
          </div>
          <h4 class="font-bold text-sm leading-snug mb-1 text-slate-900">${b.name}</h4>
          <p class="text-xs text-slate-500 mb-2">${b.address}</p>
          <div class="grid grid-cols-2 gap-1.5 bg-slate-50 p-2 rounded text-xs mb-2">
            <div><span class="text-slate-400">Lalu Lintas:</span> <b class="text-slate-800">${b.metrics.trafficVolume.toLocaleString()}</b>/jam</div>
            <div><span class="text-slate-400">Lux Sensor:</span> <b class="${b.metrics.ambientLux < thresholds.minLuxNight ? 'text-rose-600 font-bold' : 'text-slate-800'}">${b.metrics.ambientLux} Lux</b></div>
            <div><span class="text-slate-400">Arus Daya:</span> <b class="${b.metrics.powerCurrent > thresholds.maxPowerCurrent ? 'text-rose-600 font-bold' : 'text-slate-800'}">${b.metrics.powerCurrent} A</b></div>
            <div><span class="text-slate-400">Getaran:</span> <b class="${b.metrics.structuralVibration > thresholds.maxVibration ? 'text-rose-600 font-bold' : 'text-slate-800'}">${b.metrics.structuralVibration} mm/s</b></div>
          </div>
          <div class="text-[11px] text-slate-600">
            <b>Klien:</b> ${b.currentClient || '<span class="text-amber-600 font-semibold">Tersedia untuk Disewa</span>'}
          </div>
          ${
            isCritical
              ? `<div class="mt-2 p-1.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-medium flex items-center gap-1">
                   <span>⚠️ Nilai sensor melampaui batas ambang aman. Segera inspeksi teknis!</span>
                 </div>`
              : ''
          }
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on('click', () => {
        onSelectBillboard(b);
      });

      markersRef.current[b.id] = marker;

      // Ground pulse circle for Critical status
      if (isCritical) {
        const critPulseCircle = L.circle([b.coordinates.lat, b.coordinates.lng], {
          radius: 140,
          color: '#ef4444',
          weight: 2.5,
          fillColor: '#ef4444',
          fillOpacity: 0.2,
          dashArray: '6, 6',
          className: 'animate-pulse',
        }).addTo(map);
        circlesRef.current.push(critPulseCircle);
      }

      // Traffic flow radius ring (visualizes sensor coverage & impression reach)
      if (showTrafficRings) {
        const radius = Math.max(150, Math.min(600, b.metrics.trafficVolume / 15));
        const circle = L.circle([b.coordinates.lat, b.coordinates.lng], {
          radius,
          color,
          fillColor: color,
          fillOpacity: 0.12,
          weight: 1.5,
          dashArray: '4, 6',
        }).addTo(map);
        circlesRef.current.push(circle);
      }
    });
  }, [filteredBillboards, selectedBillboard, showTrafficRings, thresholds]);

  // Pan to selected billboard
  useEffect(() => {
    if (selectedBillboard && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(
        [selectedBillboard.coordinates.lat, selectedBillboard.coordinates.lng],
        15,
        { duration: 1.2 }
      );
      const marker = markersRef.current[selectedBillboard.id];
      if (marker) {
        marker.openPopup();
      }
    }
  }, [selectedBillboard]);

  return (
    <div className="relative w-full h-[calc(100vh-130px)] min-h-[600px] flex flex-col lg:flex-row overflow-hidden bg-slate-950">
      {/* Map Surface */}
      <div className="relative flex-1 h-full w-full">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Floating Top Controls Overlay */}
        <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-2 pointer-events-auto bg-slate-900/90 backdrop-blur-md p-2 rounded-xl shadow-xl border border-slate-800 text-xs">
            {/* Search Input */}
            <input
              type="text"
              placeholder="Cari titik / jalan / klien..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-800 text-slate-200 placeholder-slate-400 px-3 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:border-amber-500 w-44 sm:w-56"
            />

            {/* Type filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-slate-800 text-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-700 focus:outline-none"
            >
              <option value="ALL">Semua Tipe Billboard</option>
              <option value="LED Megatron">LED Megatron</option>
              <option value="Digital Videotron">Digital Videotron</option>
              <option value="Static Frontlite">Static Frontlite</option>
              <option value="Bando Jalan">Bando Jalan</option>
              <option value="Prisma Display">Prisma Display</option>
            </select>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-800 text-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-700 focus:outline-none"
            >
              <option value="ALL">Semua Status</option>
              <option value="Normal">🟢 Normal</option>
              <option value="Warning">🟡 Peringatan (Warning)</option>
              <option value="Critical">🔴 Kritis (Alert)</option>
              <option value="Vacant">⚪ Belum Tersewa</option>
            </select>

            {/* Heatmap Overlay Toggle & Settings */}
            <div className="flex items-center gap-1">
              <button
                id="heatmap-toggle-button"
                onClick={() => setShowHeatmap(!showHeatmap)}
                className={`px-2.5 py-1.5 rounded-lg font-semibold border flex items-center gap-1.5 transition-all shadow-sm ${
                  showHeatmap
                    ? 'bg-gradient-to-r from-orange-600 via-rose-600 to-amber-600 text-white border-orange-400/80 shadow-orange-500/25 ring-1 ring-orange-400/50'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
                title="Aktifkan/Nonaktifkan Overlay Heatmap Kepadatan Traffic Berdasarkan Sensor"
              >
                <Flame className={`w-3.5 h-3.5 ${showHeatmap ? 'text-amber-200 animate-pulse' : 'text-orange-400'}`} />
                <span>Heatmap Traffic</span>
                {showHeatmap && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-ping ml-0.5" />
                )}
              </button>

              {showHeatmap && (
                <button
                  id="heatmap-config-button"
                  onClick={() => setIsHeatConfigOpen(!isHeatConfigOpen)}
                  className={`p-1.5 rounded-lg border transition-colors ${
                    isHeatConfigOpen
                      ? 'bg-orange-500/20 text-orange-300 border-orange-500/50'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                  title="Sesuaikan Radius, Kelembutan, dan Metrik Heatmap"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Traffic rings toggle */}
            <button
              onClick={() => setShowTrafficRings(!showTrafficRings)}
              className={`px-2.5 py-1.5 rounded-lg font-medium border flex items-center gap-1.5 transition-colors ${
                showTrafficRings
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
              title="Tampilkan Radius Jangkauan Impresi Lalu Lintas"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Radius Impresi</span>
            </button>
          </div>

          {/* Map Layer Switcher & Reset Button */}
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <button
              onClick={() => {
                if (mapInstanceRef.current) {
                  mapInstanceRef.current.setView([-6.9105, 107.615], 13);
                }
              }}
              className="bg-slate-900/90 backdrop-blur-md p-2 rounded-xl shadow-xl border border-slate-800 text-xs text-slate-300 hover:text-white flex items-center gap-1 hover:bg-slate-800 transition"
              title="Reset Tampilan Peta ke Pusat Kota Bandung"
            >
              <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">Reset Bandung</span>
            </button>

            <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl shadow-xl border border-slate-800 text-xs">
              <button
                onClick={() => setMapStyle('streets')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  mapStyle === 'streets'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                Jalan
              </button>
              <button
                onClick={() => setMapStyle('satellite')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  mapStyle === 'satellite'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                Satelit
              </button>
              <button
                onClick={() => setMapStyle('dark')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  mapStyle === 'dark'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                Malam
              </button>
            </div>
          </div>
        </div>

        {/* Top Traffic Hotspots Quick Jump Strip */}
        <div className="absolute top-20 left-4 z-10 flex flex-wrap items-center gap-1.5 pointer-events-auto bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 shadow-xl text-xs">
          <span className="text-orange-400 font-semibold flex items-center gap-1 text-[11px]">
            <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500/20" />
            <span className="hidden sm:inline">Hotspot Terpadat Bandung:</span>
            <span className="sm:hidden">Top Hotspot:</span>
          </span>
          {topHotspots.map((topB, idx) => (
            <button
              key={topB.id}
              onClick={() => {
                onSelectBillboard(topB);
                if (mapInstanceRef.current) {
                  mapInstanceRef.current.flyTo(
                    [topB.coordinates.lat, topB.coordinates.lng],
                    16,
                    { duration: 1.2 }
                  );
                }
              }}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-medium border flex items-center gap-1.5 transition-all ${
                selectedBillboard?.id === topB.id
                  ? 'bg-rose-500/30 text-rose-200 border-rose-500 shadow-md ring-1 ring-rose-500/50'
                  : 'bg-slate-800/90 hover:bg-slate-800 text-slate-300 border-slate-700/80 hover:border-slate-600'
              }`}
              title={`Fokus ke ${topB.name} - ${topB.metrics.trafficVolume.toLocaleString()} kendaraan/jam`}
            >
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                idx === 0
                  ? 'bg-rose-500 text-white'
                  : idx === 1
                  ? 'bg-orange-500 text-white'
                  : 'bg-amber-500 text-slate-950'
              }`}>
                {idx + 1}
              </span>
              <span className="truncate max-w-[95px] sm:max-w-[130px] font-medium">
                {topB.name.split(' - ')[0]}
              </span>
              <span className="font-mono text-amber-300 text-[10px] font-bold">
                {topB.metrics.trafficVolume.toLocaleString()}
                <span className="text-[9px] text-slate-400 font-normal hidden md:inline">/jam</span>
              </span>
            </button>
          ))}

          {/* Critical Billboards Priority Quick Action */}
          {criticalBillboards.length > 0 && (
            <div className="flex items-center gap-1.5 pl-1.5 border-l border-slate-700">
              <span className="text-rose-400 font-bold flex items-center gap-1 text-[11px] animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                <span className="hidden sm:inline">Kritis ({criticalBillboards.length}):</span>
              </span>
              {criticalBillboards.map((critB) => (
                <button
                  key={critB.id}
                  onClick={() => {
                    onSelectBillboard(critB);
                    if (mapInstanceRef.current) {
                      mapInstanceRef.current.flyTo(
                        [critB.coordinates.lat, critB.coordinates.lng],
                        16,
                        { duration: 1.2 }
                      );
                    }
                  }}
                  className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-rose-600 hover:bg-rose-500 text-white border border-rose-300 shadow-lg shadow-rose-600/50 flex items-center gap-1.5 animate-pulse transition cursor-pointer"
                  title={`Fokus ke ${critB.name} - Status Kritis!`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                  <span className="font-mono">{critB.code}</span>
                  <span className="text-[9px] uppercase font-black tracking-wide">PULSE KRITIS</span>
                </button>
              ))}
            </div>
          )}

          {/* Real-time Aggregate City Traffic Pill */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-950/80 border border-slate-700/80 text-[11px] text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-400">Arus Kota:</span>
            <span className="font-mono font-bold text-amber-300">{totalCityTraffic.toLocaleString()}</span>
            <span className="text-slate-500 text-[10px]">kend/jam</span>
            <span className="text-slate-600">|</span>
            <span className="text-cyan-400 font-mono text-[10px]">12 Titik Aktif</span>
          </div>

          {/* AI Auto-Fix & System Stabilizer Trigger */}
          <button
            onClick={() => {
              if (onOpenAiHealer) {
                onOpenAiHealer();
              } else if (onTriggerAiFix) {
                onTriggerAiFix();
              }
            }}
            className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold border flex items-center gap-1.5 transition-all bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border-emerald-600/50 shadow-sm cursor-pointer"
            title="Buka AI Auto-Healer: Scan & Stabilkan Seluruh Parameter Bebas Error"
          >
            <Sparkles className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>AI Auto-Fix (100% Sehat)</span>
          </button>
        </div>

        {/* Heatmap Settings Floating Panel */}
        {showHeatmap && isHeatConfigOpen && (
          <div className="absolute top-32 left-4 z-20 w-72 bg-slate-900/95 backdrop-blur-md rounded-2xl p-4 border border-orange-500/30 shadow-2xl pointer-events-auto text-xs space-y-3 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-1.5 font-bold text-white">
                <Flame className="w-4 h-4 text-orange-400" />
                <span>Pengaturan Overlay Heatmap</span>
              </div>
              <button
                onClick={() => setIsHeatConfigOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                title="Tutup Pengaturan"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Metric Switcher */}
            <div>
              <span className="text-[11px] text-slate-400 block mb-1.5">Metrik Bobot Sensor:</span>
              <div className="grid grid-cols-2 gap-1 bg-slate-800/80 p-1 rounded-xl">
                <button
                  onClick={() => setHeatmapMetric('trafficVolume')}
                  className={`py-1 px-2 rounded-lg text-[10px] font-semibold transition ${
                    heatmapMetric === 'trafficVolume'
                      ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Volume / Jam
                </button>
                <button
                  onClick={() => setHeatmapMetric('dailyReach')}
                  className={`py-1 px-2 rounded-lg text-[10px] font-semibold transition ${
                    heatmapMetric === 'dailyReach'
                      ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Daily Reach
                </button>
              </div>
            </div>

            {/* Radius Slider */}
            <div>
              <div className="flex items-center justify-between text-[11px] text-slate-300 mb-1">
                <span>Radius Sebaran Panas:</span>
                <span className="font-mono text-orange-400 font-bold">{heatmapRadius}px</span>
              </div>
              <input
                type="range"
                min={20}
                max={65}
                value={heatmapRadius}
                onChange={(e) => setHeatmapRadius(Number(e.target.value))}
                className="w-full accent-orange-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
              />
            </div>

            {/* Blur Slider */}
            <div>
              <div className="flex items-center justify-between text-[11px] text-slate-300 mb-1">
                <span>Kelembutan Blur:</span>
                <span className="font-mono text-amber-400 font-bold">{heatmapBlur}px</span>
              </div>
              <input
                type="range"
                min={10}
                max={45}
                value={heatmapBlur}
                onChange={(e) => setHeatmapBlur(Number(e.target.value))}
                className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
              />
            </div>

            {/* Opacity Slider */}
            <div>
              <div className="flex items-center justify-between text-[11px] text-slate-300 mb-1">
                <span>Intensitas / Transparansi:</span>
                <span className="font-mono text-emerald-400 font-bold">{Math.round(heatmapOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.25}
                max={1.0}
                step={0.05}
                value={heatmapOpacity}
                onChange={(e) => setHeatmapOpacity(Number(e.target.value))}
                className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
              />
            </div>

            {/* Presets */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px]">
              <span className="text-slate-500">Preset Cepat:</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setHeatmapRadius(32);
                    setHeatmapBlur(18);
                    setHeatmapOpacity(0.7);
                  }}
                  className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white border border-slate-700 hover:border-slate-600 transition"
                >
                  Fokus
                </button>
                <button
                  onClick={() => {
                    setHeatmapRadius(42);
                    setHeatmapBlur(26);
                    setHeatmapOpacity(0.75);
                  }}
                  className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white border border-slate-700 hover:border-slate-600 transition"
                >
                  Standar
                </button>
                <button
                  onClick={() => {
                    setHeatmapRadius(54);
                    setHeatmapBlur(34);
                    setHeatmapOpacity(0.85);
                  }}
                  className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white border border-slate-700 hover:border-slate-600 transition"
                >
                  Lebar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Legend Overlay at Bottom-Left */}
        <div className="absolute bottom-6 left-4 z-10 space-y-2 pointer-events-auto hidden sm:block max-w-xs">
          {/* Traffic Density Heatmap Spectrum */}
          {showHeatmap && (
            <div className="bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-orange-500/30 shadow-xl text-xs space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-200 flex items-center gap-1.5 text-xs">
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  <span>Kepadatan Traffic (Sensor Real-Time)</span>
                </p>
                <span className="text-[10px] text-amber-300 font-mono font-medium">
                  {heatmapMetric === 'trafficVolume' ? 'Kendaraan/Jam' : 'Daily Reach'}
                </span>
              </div>

              {/* Spectrum Gradient Bar */}
              <div className="relative w-full h-3 rounded-full bg-gradient-to-r from-cyan-400 via-emerald-400 via-yellow-400 via-orange-500 to-rose-600 shadow-inner">
                {selectedBillboard && (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-2 h-4 bg-white border border-slate-900 rounded-sm shadow-md transition-all"
                    style={{
                      left: `${Math.max(
                        3,
                        Math.min(
                          97,
                          (getHeatmapMetricValue(selectedBillboard) /
                            Math.max(...billboards.map((b) => getHeatmapMetricValue(b)), 1000)) *
                            100
                        )
                      )}%`,
                    }}
                    title={`Posisi ${selectedBillboard.name}: ${getHeatmapMetricValue(selectedBillboard).toLocaleString()} ${
                      heatmapMetric === 'trafficVolume' ? 'kend/jam' : 'impresi/hari'
                    }`}
                  />
                )}
              </div>

              {/* Scale Labels */}
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span className="text-cyan-400">&lt; 2.000</span>
                <span className="text-emerald-400">3.500</span>
                <span className="text-yellow-400">5.000</span>
                <span className="text-orange-400">6.500</span>
                <span className="text-rose-400 font-bold">&gt; 7.500+</span>
              </div>

              {selectedBillboard && (
                <div className="text-[10px] bg-slate-800/80 rounded-lg p-1.5 border border-slate-700/60 flex items-center justify-between text-slate-300">
                  <span className="truncate max-w-[150px] font-medium">{selectedBillboard.name.split(' - ')[0]}:</span>
                  <span className="font-mono text-amber-300 font-bold">
                    {selectedBillboard.metrics.trafficVolume.toLocaleString()} kend/jam
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Billboard Sensor Status Legend */}
          <div className="bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-800 shadow-xl text-xs">
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>Status Sensor Titik Billboard</span>
              </p>
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 whitespace-nowrap">
                <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>OSM (Bebas Key & Watermark)</span>
              </span>
            </div>
            <div className="space-y-1.5 text-slate-300">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
                  <span>Normal (Telemetri Sehat)</span>
                </span>
                <span className="font-mono text-emerald-400 font-bold">
                  {billboards.filter((b) => b.status === 'Normal').length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-500/20" />
                  <span>Waspada (Lux/Arus Mendekati Batas)</span>
                </span>
                <span className="font-mono text-amber-400 font-bold">
                  {billboards.filter((b) => b.status === 'Warning').length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse ring-2 ring-rose-500/20" />
                  <span>Kritis (Ambang Batas Terlampaui)</span>
                </span>
                <span className="font-mono text-rose-400 font-bold">
                  {billboards.filter((b) => b.status === 'Critical').length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                  <span>Tersedia / Kosong (Vacant)</span>
                </span>
                <span className="font-mono text-slate-400 font-bold">
                  {billboards.filter((b) => b.status === 'Vacant').length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Billboard Side Inspector Panel */}
      <div className="w-full lg:w-96 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col h-auto lg:h-full overflow-y-auto z-10 shadow-2xl">
        {selectedBillboard ? (
          <div className="p-5 flex flex-col gap-4">
            {/* Header info */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-md text-xs font-bold font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {selectedBillboard.code}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    selectedBillboard.status === 'Critical'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : selectedBillboard.status === 'Warning'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : selectedBillboard.status === 'Vacant'
                      ? 'bg-slate-700 text-slate-300'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {selectedBillboard.status.toUpperCase()}
                </span>
              </div>
              <h3 className="text-base font-bold text-white leading-snug">
                {selectedBillboard.name}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">{selectedBillboard.address}</p>
            </div>

            {/* Billboard specs */}
            <div className="grid grid-cols-2 gap-2 p-3 bg-slate-800/60 rounded-xl border border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Tipe Konstruksi</span>
                <span className="font-semibold text-slate-200">{selectedBillboard.type}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Dimensi Layar</span>
                <span className="font-semibold text-slate-200">{selectedBillboard.dimensions}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block text-[11px]">Arah Paparan (Facing)</span>
                <span className="font-medium text-slate-300">{selectedBillboard.orientation}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Penyewa Saat Ini</span>
                <span className="font-semibold text-amber-400">
                  {selectedBillboard.currentClient || 'Belum Tersewa'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Jatuh Tempo</span>
                <span className="font-medium text-slate-300">
                  {selectedBillboard.contractExpiry || '-'}
                </span>
              </div>
            </div>

            {/* Real-time Sensor Telemetry Dashboard */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Pengukuran Sensor Real-Time</span>
                </h4>
                <span className="text-[10px] text-slate-500 font-mono">
                  Update: {new Date(selectedBillboard.metrics.lastUpdated).toLocaleTimeString('id-ID')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {/* Traffic Sensor */}
                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                    <span className="flex items-center gap-1">
                      <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Lalu Lintas</span>
                    </span>
                    <span className="text-[10px] text-cyan-400">Kendaraan</span>
                  </div>
                  <div className="text-lg font-bold text-white font-mono">
                    {selectedBillboard.metrics.trafficVolume.toLocaleString('id-ID')}
                    <span className="text-xs font-normal text-slate-400"> /jam</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Pejalan Kaki: {selectedBillboard.metrics.pedestrianFlow} orang/jam
                  </div>
                </div>

                {/* Lux Sensor */}
                <div
                  className={`p-3 rounded-xl border ${
                    selectedBillboard.metrics.ambientLux < thresholds.minLuxNight
                      ? 'bg-rose-950/40 border-rose-600/50'
                      : 'bg-slate-800/80 border-slate-700/60'
                  }`}
                >
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                    <span className="flex items-center gap-1">
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                      <span>Intensitas Lux</span>
                    </span>
                    <span className="text-[10px] text-amber-400">Pencahayaan</span>
                  </div>
                  <div className="text-lg font-bold font-mono text-white">
                    {selectedBillboard.metrics.ambientLux}
                    <span className="text-xs font-normal text-slate-400"> Lux</span>
                  </div>
                  <div className="text-[10px] mt-1">
                    {selectedBillboard.metrics.ambientLux < thresholds.minLuxNight ? (
                      <span className="text-rose-400 font-medium">⚠️ Redup (Di bawah ambang batas)</span>
                    ) : (
                      <span className="text-emerald-400">Pencahayaan optimal</span>
                    )}
                  </div>
                </div>

                {/* Power & Voltage Sensor */}
                <div
                  className={`p-3 rounded-xl border ${
                    selectedBillboard.metrics.powerCurrent > thresholds.maxPowerCurrent ||
                    selectedBillboard.metrics.powerVoltage < thresholds.minVoltage
                      ? 'bg-rose-950/40 border-rose-600/50'
                      : 'bg-slate-800/80 border-slate-700/60'
                  }`}
                >
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                    <span className="flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-yellow-400" />
                      <span>Daya Listrik</span>
                    </span>
                    <span className="text-[10px] text-yellow-400">PLN / Inverter</span>
                  </div>
                  <div className="text-lg font-bold font-mono text-white">
                    {selectedBillboard.metrics.powerKw}
                    <span className="text-xs font-normal text-slate-400"> kW</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                    <span>{selectedBillboard.metrics.powerVoltage} V</span>
                    <span>{selectedBillboard.metrics.powerCurrent} A</span>
                  </div>
                </div>

                {/* Structural Vibration & Wind Sensor */}
                <div
                  className={`p-3 rounded-xl border ${
                    selectedBillboard.metrics.structuralVibration > thresholds.maxVibration ||
                    selectedBillboard.metrics.windSpeed > thresholds.maxWindSpeed
                      ? 'bg-rose-950/40 border-rose-600/50'
                      : 'bg-slate-800/80 border-slate-700/60'
                  }`}
                >
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                    <span className="flex items-center gap-1">
                      <Vibrate className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Getaran & Angin</span>
                    </span>
                    <span className="text-[10px] text-indigo-400">Struktural</span>
                  </div>
                  <div className="text-lg font-bold font-mono text-white">
                    {selectedBillboard.metrics.structuralVibration}
                    <span className="text-xs font-normal text-slate-400"> mm/s</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                    <span>Angin: {selectedBillboard.metrics.windSpeed} km/h</span>
                    <span>Suhu: {selectedBillboard.metrics.temperature}°C</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions for Selected Billboard */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              {onOpenDetailModal && (
                <button
                  onClick={() => onOpenDetailModal(selectedBillboard)}
                  className="w-full py-2.5 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/20 transition-all active:scale-[0.98]"
                >
                  <Activity className="w-4 h-4" />
                  <span>Lihat Detail Sensor Lengkap (26 Kolom)</span>
                </button>
              )}

              {onRunAiForBillboard && selectedBillboard.currentClient && (
                <button
                  onClick={() => onRunAiForBillboard(selectedBillboard)}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 transition-all active:scale-[0.98]"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Jalankan Prediksi AI CRM Klien Ini</span>
                </button>
              )}

              {/* Direct External Map Tools (No API Key Required) */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <a
                  href={`https://www.google.com/maps?q&layer=c&cbll=${selectedBillboard.coordinates.lat},${selectedBillboard.coordinates.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-medium flex items-center justify-center gap-1.5 border border-slate-700 transition"
                  title="Lihat sudut pandang jalan sekitar reklame via Google Street View di tab baru (Gratis, tanpa API key)"
                >
                  <Compass className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Street View ↗</span>
                </a>

                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${selectedBillboard.coordinates.lat},${selectedBillboard.coordinates.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center justify-center gap-1.5 border border-slate-700 transition"
                  title="Buka rute navigasi dan foto satelit di Google Maps tab baru (Gratis, tanpa API key)"
                >
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>Google Maps ↗</span>
                </a>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 pt-1">
                <span>Koordinat:</span>
                <span className="font-mono text-slate-400">
                  {selectedBillboard.coordinates.lat.toFixed(5)},{' '}
                  {selectedBillboard.coordinates.lng.toFixed(5)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500">
            <Building className="w-12 h-12 text-slate-700 mb-3" />
            <p className="text-sm font-semibold text-slate-400">Pilih Titik Billboard di Peta</p>
            <p className="text-xs text-slate-600 mt-1 max-w-xs">
              Klik salah satu pin pada peta interaktif Bandung untuk memantau telemetri sensor,
              arus lalu lintas, status daya, dan menjalankan analisis prediktif AI.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
