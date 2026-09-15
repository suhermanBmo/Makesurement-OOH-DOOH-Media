import L from 'leaflet';
import { BillboardLocation } from '../types';

// Global defense against IndexSizeError when canvas width or height is 0
if (typeof window !== 'undefined' && typeof window.CanvasRenderingContext2D !== 'undefined') {
  const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
  CanvasRenderingContext2D.prototype.getImageData = function (
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    settings?: ImageDataSettings
  ) {
    if (!sw || !sh || sw <= 0 || sh <= 0) {
      return this.createImageData(1, 1);
    }
    try {
      return originalGetImageData.call(this, sx, sy, sw, sh, settings);
    } catch (err: any) {
      if (err instanceof DOMException && err.name === 'IndexSizeError') {
        return this.createImageData(1, 1);
      }
      throw err;
    }
  };
}

export interface HeatmapOptions extends L.LayerOptions {
  radius?: number;
  blur?: number;
  max?: number;
  maxZoom?: number;
  minOpacity?: number;
  gradient?: { [key: number]: string };
}

export const DEFAULT_HEATMAP_CONFIG: HeatmapOptions = {
  radius: 40,
  blur: 24,
  minOpacity: 0.35,
  maxZoom: 17,
};

export const TRAFFIC_HEATMAP_GRADIENT: { [key: number]: string } = {
  0.15: '#06b6d4', // cyan: flow lancar (< 2.500 kend/jam)
  0.35: '#10b981', // emerald: flow normal teratur (2.500 - 4.000 kend/jam)
  0.55: '#facc15', // yellow: kepadatan sedang (4.000 - 5.500 kend/jam)
  0.75: '#f97316', // orange: arus padat merayap (5.500 - 6.800 kend/jam)
  1.00: '#ef4444', // crimson red: kemacetan parah / prime hotspot (> 6.800 kend/jam)
};

/**
 * Lightweight, zero-dependency canvas heatmap renderer with 0-height protection
 */
export class SafeSimpleHeat {
  private _canvas: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D;
  private _width: number;
  private _height: number;
  private _max: number = 1.0;
  private _data: [number, number, number][] = [];
  private _circle: HTMLCanvasElement | null = null;
  private _r: number = 40;
  private _grad: Uint8ClampedArray | null = null;
  public defaultRadius: number = 38;
  public defaultGradient: { [key: number]: string } = TRAFFIC_HEATMAP_GRADIENT;

  constructor(canvas: HTMLCanvasElement) {
    this._canvas = canvas;
    this._ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    this._width = canvas.width;
    this._height = canvas.height;
  }

  resize(w: number, h: number): this {
    this._width = w;
    this._height = h;
    return this;
  }

  data(points: [number, number, number][]): this {
    this._data = points;
    return this;
  }

  max(m: number): this {
    this._max = m;
    return this;
  }

  radius(r: number, blur?: number): this {
    const blurVal = blur !== undefined ? blur : 20;
    const a = (this._circle = document.createElement('canvas'));
    const s = a.getContext('2d')!;
    const rad = (this._r = r + blurVal);

    a.width = a.height = 2 * rad;
    s.shadowOffsetX = s.shadowOffsetY = 200;
    s.shadowBlur = blurVal;
    s.shadowColor = 'black';
    s.beginPath();
    s.arc(rad - 200, rad - 200, r, 0, 2 * Math.PI, true);
    s.closePath();
    s.fill();

    return this;
  }

  gradient(gradObj: { [key: number]: string }): this {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);

    canvas.width = 1;
    canvas.height = 256;

    for (const key in gradObj) {
      gradient.addColorStop(Number(key), gradObj[key]);
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1, 256);
    this._grad = ctx.getImageData(0, 0, 1, 256).data;
    return this;
  }

  draw(minOpacity: number = 0.05): this {
    if (!this._width || !this._height || this._width <= 0 || this._height <= 0) {
      return this;
    }

    if (!this._circle) this.radius(this.defaultRadius);
    if (!this._grad) this.gradient(this.defaultGradient);

    const ctx = this._ctx;
    ctx.clearRect(0, 0, this._width, this._height);

    for (let i = 0; i < this._data.length; i++) {
      const p = this._data[i];
      const intensity = p[2] / this._max;
      ctx.globalAlpha = Math.max(Math.min(intensity, 1.0), minOpacity);
      if (this._circle) {
        ctx.drawImage(this._circle, p[0] - this._r, p[1] - this._r);
      }
    }

    try {
      const imgData = ctx.getImageData(0, 0, this._width, this._height);
      const data = imgData.data;
      const grad = this._grad;

      if (grad) {
        for (let i = 3; i < data.length; i += 4) {
          const alpha = data[i];
          if (alpha > 0) {
            const offset = 4 * alpha;
            data[i - 3] = grad[offset];
            data[i - 2] = grad[offset + 1];
            data[i - 1] = grad[offset + 2];
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);
    } catch {
      // Safe ignore in case canvas is in background / 0 dimension
    }

    return this;
  }
}

/**
 * RealtimeTrafficHeatLayer extending Leaflet L.Layer
 * Native ESM, 100% stable, zero external UMD quirks
 */
export class RealtimeTrafficHeatLayer extends L.Layer {
  private _latlngs: [number, number, number][];
  public options: HeatmapOptions;
  private _canvas: HTMLCanvasElement | null = null;
  private _heat: SafeSimpleHeat | null = null;
  private _frame: number | null = null;

  constructor(latlngs: [number, number, number][], options: HeatmapOptions = {}) {
    super();
    this._latlngs = latlngs;
    this.options = {
      radius: 40,
      blur: 24,
      max: 1.0,
      minOpacity: 0.35,
      gradient: TRAFFIC_HEATMAP_GRADIENT,
      ...options,
    };
  }

  setLatLngs(latlngs: [number, number, number][]): this {
    this._latlngs = latlngs;
    return this.redraw();
  }

  setOptions(options: Partial<HeatmapOptions>): this {
    this.options = { ...this.options, ...options };
    if (this._heat) {
      this._updateOptions();
    }
    return this.redraw();
  }

  private _updateOptions(): void {
    if (!this._heat) return;
    this._heat.radius(this.options.radius || 40, this.options.blur || 24);
    if (this.options.gradient) {
      this._heat.gradient(this.options.gradient);
    }
    if (this.options.max) {
      this._heat.max(this.options.max);
    }
  }

  redraw(): this {
    if (!this._heat || this._frame !== null) return this;
    if (this._map && (this._map as any)._animating) return this;

    this._frame = L.Util.requestAnimFrame(this._redraw, this);
    return this;
  }

  onAdd(map: L.Map): this {
    this._map = map;
    if (!this._canvas) {
      this._initCanvas();
    }

    if (this._canvas) {
      map.getPanes().overlayPane.appendChild(this._canvas);
    }

    map.on('moveend', this._reset, this);
    map.on('resize', this._reset, this);
    map.on('viewreset', this._reset, this);

    if (map.options.zoomAnimation && L.Browser.any3d) {
      map.on('zoomanim', this._animateZoom, this);
    }

    this._reset();
    return this;
  }

  onRemove(map: L.Map): this {
    if (this._canvas && this._canvas.parentNode) {
      this._canvas.parentNode.removeChild(this._canvas);
    }

    map.off('moveend', this._reset, this);
    map.off('resize', this._reset, this);
    map.off('viewreset', this._reset, this);

    if (map.options.zoomAnimation && L.Browser.any3d) {
      map.off('zoomanim', this._animateZoom, this);
    }

    if (this._frame !== null) {
      L.Util.cancelAnimFrame(this._frame);
      this._frame = null;
    }

    return this;
  }

  private _initCanvas(): void {
    if (!this._map) return;
    const canvas = (this._canvas = L.DomUtil.create(
      'canvas',
      'leaflet-heatmap-layer leaflet-layer'
    ) as HTMLCanvasElement);

    const originProp = L.DomUtil.testProp(['transformOrigin', 'WebkitTransformOrigin', 'msTransformOrigin']);
    if (originProp) {
      (canvas.style as any)[originProp] = '50% 50%';
    }

    const size = this._map.getSize();
    const w = Math.max(1, size?.x || 1);
    const h = Math.max(1, size?.y || 1);
    canvas.width = w;
    canvas.height = h;

    const animated = this._map.options.zoomAnimation && L.Browser.any3d;
    L.DomUtil.addClass(canvas, `leaflet-zoom-${animated ? 'animated' : 'hide'}`);

    this._heat = new SafeSimpleHeat(canvas);
    this._updateOptions();
  }

  private _reset(): void {
    if (!this._map || !this._canvas || !this._heat) return;
    const size = this._map.getSize();
    if (!size || size.x <= 0 || size.y <= 0) return;

    const topLeft = this._map.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(this._canvas, topLeft);

    if (this._canvas.width !== size.x || this._canvas.height !== size.y) {
      this._canvas.width = size.x;
      this._canvas.height = size.y;
      this._heat.resize(size.x, size.y);
    }

    this._redraw();
  }

  private _redraw(): void {
    if (!this._map || !this._heat || !this._canvas) {
      this._frame = null;
      return;
    }

    const size = this._map.getSize();
    if (!size || size.x <= 0 || size.y <= 0) {
      this._frame = null;
      return;
    }

    const bounds = this._map.getBounds();
    const pad = 0.03; // Lat/Lng padding
    const southWest = bounds.getSouthWest();
    const northEast = bounds.getNorthEast();

    const extendedBounds = L.latLngBounds(
      [southWest.lat - pad, southWest.lng - pad],
      [northEast.lat + pad, northEast.lng + pad]
    );

    const pixelData: [number, number, number][] = [];

    for (let i = 0; i < this._latlngs.length; i++) {
      const p = this._latlngs[i];
      const latLng = L.latLng(p[0], p[1]);

      if (extendedBounds.contains(latLng)) {
        const point = this._map.latLngToContainerPoint(latLng);
        pixelData.push([Math.round(point.x), Math.round(point.y), p[2]]);
      }
    }

    this._heat.data(pixelData).draw(this.options.minOpacity || 0.15);
    this._frame = null;
  }

  private _animateZoom(e: any): void {
    if (!this._map || !this._canvas) return;
    const scale = this._map.getZoomScale(e.zoom);
    const offset = (this._map as any)._getCenterOffset(e.center)._multiplyBy(-scale).subtract((this._map as any)._getMapPanePos());

    if (L.DomUtil.setTransform) {
      L.DomUtil.setTransform(this._canvas, offset, scale);
    } else {
      const transStr = (L.DomUtil as any).getTranslateString
        ? (L.DomUtil as any).getTranslateString(offset)
        : `translate3d(${offset.x}px,${offset.y}px,0)`;
      this._canvas.style[L.DomUtil.TRANSFORM] = `${transStr} scale(${scale})`;
    }
  }
}

/**
 * Factory function to create RealtimeTrafficHeatLayer
 */
export function createTrafficHeatLayer(
  latlngs: [number, number, number][],
  options?: HeatmapOptions
): RealtimeTrafficHeatLayer {
  return new RealtimeTrafficHeatLayer(latlngs, options);
}

/**
 * Ensures global compatibility for L.heatLayer
 */
export async function loadLeafletHeat(): Promise<boolean> {
  if (typeof window !== 'undefined') {
    (window as any).L = L;
    (L as any).heatLayer = (latlngs: any, options: any) => new RealtimeTrafficHeatLayer(latlngs, options);
    (window as any).L.heatLayer = (L as any).heatLayer;
  }
  return true;
}

/**
 * Generate real-time traffic corridor density heat points
 * Models Bandung's primary arterial road corridors radiating from billboard locations
 */
export function generateTrafficCorridorHeatPoints(
  billboards: BillboardLocation[],
  metric: 'trafficVolume' | 'dailyReach',
  maxVal: number
): [number, number, number][] {
  const points: [number, number, number][] = [];

  // Corridor road orientation vectors [dLat, dLng] for realistic road traffic simulation
  const corridorVectors: { [key: string]: [number, number][] } = {
    // East-West corridors: Pasteur, Pasupati, Asia Afrika, Soekarno-Hatta
    'BDO-PST-01': [[0, 0.0006], [0, -0.0006], [0.0001, 0.0013], [-0.0001, -0.0013]],
    'BDO-ASAF-03': [[0, 0.0005], [0, -0.0005], [0, 0.0011], [0, -0.0011]],
    'BDO-PST-05': [[0, 0.0007], [0, -0.0007], [0.0002, 0.0015], [-0.0002, -0.0015]],
    'BDO-SKHT-08': [[0, 0.0008], [0, -0.0008], [0, 0.0017], [0, -0.0017]],
    'BDO-MART-11': [[0, 0.0006], [0, -0.0006], [0.0001, 0.0012], [-0.0001, -0.0012]],
    'BDO-SPRT-12': [[0, 0.0005], [0, -0.0005], [0.0001, 0.0011], [-0.0001, -0.0011]],

    // North-South corridors: Dago, Cihampelas, Setiabudi, Buah Batu
    'BDO-DGO-02': [[0.0006, 0], [-0.0006, 0], [0.0013, 0.0001], [-0.0013, -0.0001]],
    'BDO-CHMP-04': [[0.0005, 0], [-0.0005, 0], [0.0012, 0], [-0.0012, 0]],
    'BDO-BBAT-07': [[0.0007, 0], [-0.0007, 0], [0.0015, 0], [-0.0015, 0]],
    'BDO-STBD-09': [[0.0007, 0], [-0.0007, 0], [0.0014, 0.0001], [-0.0014, -0.0001]],
    'BDO-KIR-06': [[0.0006, 0.0004], [-0.0006, -0.0004], [0.0013, 0.0008], [-0.0013, -0.0008]],
    'BDO-PST-10': [[0, 0.0006], [0, -0.0006], [0.0001, 0.0012], [-0.0001, -0.0012]],
  };

  billboards.forEach((b) => {
    const rawVal =
      metric === 'trafficVolume'
        ? b.metrics.trafficVolume
        : Math.round(b.metrics.trafficVolume * 14.5 + (b.metrics.pedestrianFlow || 0) * 10);

    const baseIntensity = Math.max(0.2, Math.min(1.0, rawVal / Math.max(maxVal, 1000)));

    // Core point at billboard anchor
    points.push([b.coordinates.lat, b.coordinates.lng, baseIntensity]);

    // Radiate corridor traffic flow points along the arterial road axis
    const vectors = corridorVectors[b.code] || [
      [0.0005, 0],
      [-0.0005, 0],
      [0, 0.0005],
      [0, -0.0005],
    ];

    vectors.forEach(([dLat, dLng], idx) => {
      const decay = idx < 2 ? 0.78 : 0.52;
      points.push([
        b.coordinates.lat + dLat,
        b.coordinates.lng + dLng,
        Number((baseIntensity * decay).toFixed(3)),
      ]);
    });
  });

  return points;
}
