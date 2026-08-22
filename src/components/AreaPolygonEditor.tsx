import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Trash2, Undo2 } from "lucide-react";

export type BoundaryPoint = { lat: number; lng: number };

const DEFAULT_CENTER: BoundaryPoint = { lat: 33.3152, lng: 44.3661 }; // بغداد

/**
 * محرر حدود المنطقة على خريطة تفاعلية (Leaflet).
 * - الضغط على الخريطة يضيف نقطة جديدة.
 * - سحب أي نقطة يعدّل الحدود.
 * - الضغط على نقطة يحذفها.
 */
export default function AreaPolygonEditor({
  points,
  onChange,
  readOnly = false,
  height = 320,
}: {
  points: BoundaryPoint[];
  onChange?: (pts: BoundaryPoint[]) => void;
  readOnly?: boolean;
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layersRef = useRef<{ polygon: any; markers: any[] }>({ polygon: null, markers: [] });
  const pointsRef = useRef<BoundaryPoint[]>(points);
  const onChangeRef = useRef(onChange);
  const [ready, setReady] = useState(false);

  pointsRef.current = points;
  onChangeRef.current = onChange;

  // Boot the map once, on the client only.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [L] = await Promise.all([
        import("leaflet"),
        import("leaflet/dist/leaflet.css"),
      ]);
      if (cancelled || !containerRef.current || mapRef.current) return;
      leafletRef.current = L.default ?? L;
      const Lf = leafletRef.current;

      const first = pointsRef.current[0] ?? DEFAULT_CENTER;
      const map = Lf.map(containerRef.current, { center: [first.lat, first.lng], zoom: 13 });
      Lf.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);

      if (!readOnly) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.on("click", (e: any) => {
          onChangeRef.current?.([
            ...pointsRef.current,
            { lat: Number(e.latlng.lat.toFixed(6)), lng: Number(e.latlng.lng.toFixed(6)) },
          ]);
        });
      }

      mapRef.current = map;
      setReady(true);
      setTimeout(() => map.invalidateSize(), 60);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove?.();
      mapRef.current = null;
    };
  }, [readOnly]);

  // Redraw polygon + markers whenever the points change.
  useEffect(() => {
    const Lf = leafletRef.current;
    const map = mapRef.current;
    if (!ready || !Lf || !map) return;

    layersRef.current.markers.forEach((m) => map.removeLayer(m));
    layersRef.current.markers = [];
    if (layersRef.current.polygon) {
      map.removeLayer(layersRef.current.polygon);
      layersRef.current.polygon = null;
    }

    if (points.length >= 2) {
      const latlngs = points.map((p) => [p.lat, p.lng]);
      layersRef.current.polygon =
        points.length >= 3
          ? Lf.polygon(latlngs, { color: "#f97316", weight: 3, fillOpacity: 0.15 }).addTo(map)
          : Lf.polyline(latlngs, { color: "#f97316", weight: 3, dashArray: "6 6" }).addTo(map);
    }

    points.forEach((p, i) => {
      const marker = Lf.circleMarker([p.lat, p.lng], {
        radius: 7,
        color: "#fff",
        weight: 2,
        fillColor: "#f97316",
        fillOpacity: 1,
      }).addTo(map);
      marker.bindTooltip(String(i + 1), { permanent: false, direction: "top" });
      if (!readOnly) {
        marker.on("click", () => {
          onChangeRef.current?.(pointsRef.current.filter((_, idx) => idx !== i));
        });
        // Drag by re-placing the point: press & move on the marker.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        marker.on("mousedown", (down: any) => {
          map.dragging.disable();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const move = (ev: any) => {
            const next = [...pointsRef.current];
            next[i] = {
              lat: Number(ev.latlng.lat.toFixed(6)),
              lng: Number(ev.latlng.lng.toFixed(6)),
            };
            onChangeRef.current?.(next);
          };
          const up = () => {
            map.off("mousemove", move);
            map.off("mouseup", up);
            map.dragging.enable();
          };
          map.on("mousemove", move);
          map.on("mouseup", up);
          down.originalEvent?.preventDefault?.();
        });
      }
      layersRef.current.markers.push(marker);
    });

    if (points.length > 0) {
      try {
        map.fitBounds(
          Lf.latLngBounds(points.map((p) => [p.lat, p.lng])).pad(0.35),
          { maxZoom: 16, animate: false },
        );
      } catch {
        /* single point / invalid bounds */
      }
    }
  }, [points, ready, readOnly]);

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-2xl border border-border">
        <div ref={containerRef} style={{ height }} className="w-full" />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/60">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}
      </div>
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-[11px] font-bold">
            <MapPin className="h-3.5 w-3.5 text-primary" /> النقاط: {points.length}
          </span>
          <button
            type="button"
            onClick={() => onChange?.(points.slice(0, -1))}
            disabled={points.length === 0}
            className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-[11px] font-black disabled:opacity-50"
          >
            <Undo2 className="h-3.5 w-3.5" /> تراجع
          </button>
          <button
            type="button"
            onClick={() => onChange?.([])}
            disabled={points.length === 0}
            className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-3 py-1.5 text-[11px] font-black text-destructive disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" /> مسح الحدود
          </button>
          <p className="w-full text-[11px] text-muted-foreground">
            اضغط على الخريطة لإضافة نقطة، اسحب النقطة لتحريكها، واضغط عليها لحذفها. يلزم 3 نقاط على الأقل.
          </p>
        </div>
      )}
    </div>
  );
}
