import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Bike, MapPin, Navigation2, PackageCheck, Phone, StickyNote, Store, User, Wallet } from "lucide-react";
import { supabase } from "../integrations/supabase/client";
import { formatIQD } from "../lib/format";

// Fix default marker icons under bundlers
const iconRetinaUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png";
const iconUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png";
const shadowUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png";

const customerIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Orange dot for the driver
const driverIcon = L.divIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:9999px;background:#f97316;border:3px solid white;box-shadow:0 0 0 2px rgba(249,115,22,0.35), 0 4px 10px rgba(0,0,0,0.25)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

export type ActiveOrder = {
  id: string;
  local_order_id: string | null;
  store_id: string;
  customer_name: string;
  customer_phone: string | null;
  address: string | null;
  notes: string | null;
  items: unknown;
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_method: string | null;
  status: string;
  driver_id: string | null;
  customer_lat: number | null;
  customer_lng: number | null;
  driver_lat: number | null;
  driver_lng: number | null;
  created_at: string;
};

function statusLabel(s: string) {
  switch (s) {
    case "driver_assigned": return "بعهدتي";
    case "picked_up": return "تم الاستلام من المتجر";
    case "on_the_way": return "في الطريق للعميل";
    case "delivered": return "مُسلَّم";
    default: return s;
  }
}

function paymentLabel(p: string | null) {
  if (p === "cod") return "الدفع عند الاستلام";
  if (p === "wallet") return "المحفظة";
  return p ?? "—";
}

export function ActiveDeliveryDetails({
  order,
  storeName,
  onDeliver,
  busy,
}: {
  order: ActiveOrder;
  storeName?: string;
  onDeliver: () => void;
  busy: boolean;
}) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const customerMarker = useRef<L.Marker | null>(null);
  const driverMarker = useRef<L.Marker | null>(null);
  const routeLayer = useRef<L.Polyline | null>(null);
  const [driverPos, setDriverPos] = useState<{ lat: number; lng: number } | null>(
    order.driver_lat != null && order.driver_lng != null
      ? { lat: order.driver_lat, lng: order.driver_lng }
      : null,
  );

  const customer =
    order.customer_lat != null && order.customer_lng != null
      ? { lat: order.customer_lat, lng: order.customer_lng }
      : null;

  // Initialize map once
  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    const center = customer ?? driverPos ?? { lat: 33.3152, lng: 44.3661 }; // Baghdad fallback
    const map = L.map(mapEl.current, { zoomControl: false, attributionControl: false }).setView(
      [center.lat, center.lng],
      14,
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);
    L.control.zoom({ position: "topleft" }).addTo(map);
    mapRef.current = map;

    if (customer) {
      customerMarker.current = L.marker([customer.lat, customer.lng], { icon: customerIcon })
        .addTo(map)
        .bindPopup("موقع العميل");
    }
    // Ensure size is right after layout
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapRef.current = null;
      customerMarker.current = null;
      driverMarker.current = null;
      routeLayer.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track driver location + push to DB (throttled)
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    let lastPush = 0;
    const watch = navigator.geolocation.watchPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setDriverPos(p);
        const now = Date.now();
        if (now - lastPush > 12000) {
          lastPush = now;
          supabase
            .from("customer_orders")
            .update({
              driver_lat: p.lat,
              driver_lng: p.lng,
              driver_location_updated_at: new Date().toISOString(),
            })
            .eq("id", order.id);
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [order.id]);

  // Update driver marker + route
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !driverPos) return;
    if (!driverMarker.current) {
      driverMarker.current = L.marker([driverPos.lat, driverPos.lng], { icon: driverIcon })
        .addTo(map)
        .bindPopup("موقعك");
    } else {
      driverMarker.current.setLatLng([driverPos.lat, driverPos.lng]);
    }

    if (customer) {
      // Fit bounds to both
      const bounds = L.latLngBounds([
        [driverPos.lat, driverPos.lng],
        [customer.lat, customer.lng],
      ]);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });

      // Fetch route from OSRM
      const ctrl = new AbortController();
      fetch(
        `https://router.project-osrm.org/route/v1/driving/${driverPos.lng},${driverPos.lat};${customer.lng},${customer.lat}?overview=full&geometries=geojson`,
        { signal: ctrl.signal },
      )
        .then((r) => r.ok ? r.json() : null)
        .then((j) => {
          if (!j?.routes?.[0]?.geometry?.coordinates) return;
          const coords: [number, number][] = j.routes[0].geometry.coordinates.map(
            (c: [number, number]) => [c[1], c[0]],
          );
          if (routeLayer.current) routeLayer.current.remove();
          routeLayer.current = L.polyline(coords, {
            color: "#f97316",
            weight: 5,
            opacity: 0.85,
          }).addTo(map);
        })
        .catch(() => {});
      return () => ctrl.abort();
    }
  }, [driverPos, customer?.lat, customer?.lng]);

  const items = Array.isArray(order.items)
    ? (order.items as { name: string; qty: number; price: number }[])
    : [];

  const navUrl = customer
    ? `https://www.google.com/maps/dir/?api=1&destination=${customer.lat},${customer.lng}&travelmode=driving`
    : null;

  return (
    <article className="overflow-hidden rounded-3xl bg-card shadow-elegant">
      {/* Map */}
      <div className="relative">
        <div ref={mapEl} className="h-64 w-full bg-muted" />
        {!customer && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 text-xs text-muted-foreground">
            لا يتوفر موقع GPS لهذا العميل
          </div>
        )}
        {customer && (
          <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-background/90 px-3 py-1 text-[10px] font-black text-foreground shadow-soft" dir="ltr">
            {customer.lat.toFixed(5)}, {customer.lng.toFixed(5)}
          </div>
        )}
      </div>

      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-muted-foreground" dir="ltr">
            #{order.local_order_id ?? order.id.slice(0, 8)}
          </span>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-black text-primary">
            {statusLabel(order.status)}
          </span>
        </div>

        {/* Navigate button */}
        {navUrl && (
          <a
            href={navUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-warm text-sm font-black text-white shadow-elegant active:scale-[0.98]"
          >
            <Navigation2 className="h-4 w-4" />
            التنقل عبر الخرائط
          </a>
        )}

        {/* Customer info */}
        <section className="space-y-2 rounded-2xl bg-muted/40 p-3 text-xs">
          <Row icon={<User className="h-3.5 w-3.5" />} label={order.customer_name} />
          {order.customer_phone && (
            <a
              href={`tel:${order.customer_phone}`}
              className="flex items-center gap-2 text-primary"
            >
              <Phone className="h-3.5 w-3.5" />
              <span dir="ltr" className="truncate font-black">{order.customer_phone}</span>
            </a>
          )}
          {order.address && <Row icon={<MapPin className="h-3.5 w-3.5" />} label={order.address} />}
          {order.notes && (
            <Row icon={<StickyNote className="h-3.5 w-3.5" />} label={order.notes} />
          )}
          <Row icon={<Store className="h-3.5 w-3.5" />} label={storeName ?? "متجر"} />
        </section>

        {/* Items */}
        {items.length > 0 && (
          <section className="rounded-2xl bg-background p-3">
            <h4 className="mb-2 text-[11px] font-black text-muted-foreground">تفاصيل الطلب</h4>
            <ul className="space-y-1.5 text-xs">
              {items.map((it, i) => (
                <li key={i} className="flex items-center justify-between gap-2">
                  <span className="truncate text-foreground">
                    {it.name} <span className="text-muted-foreground">× {it.qty}</span>
                  </span>
                  <span className="font-black text-foreground">{formatIQD(it.price * it.qty)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Totals + payment */}
        <section className="grid grid-cols-3 gap-2 rounded-2xl bg-muted/40 p-3 text-center text-[11px]">
          <div>
            <p className="text-muted-foreground">التوصيل</p>
            <p className="font-black">{formatIQD(order.delivery_fee)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">المجموع</p>
            <p className="font-black">{formatIQD(order.subtotal)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">الإجمالي</p>
            <p className="font-black text-primary">{formatIQD(order.total)}</p>
          </div>
        </section>

        <div className="flex items-center gap-2 rounded-2xl bg-background p-3 text-xs">
          <Wallet className="h-4 w-4 text-primary" />
          <span className="font-black text-foreground">طريقة الدفع:</span>
          <span className="text-muted-foreground">{paymentLabel(order.payment_method)}</span>
        </div>

        <button
          disabled={busy}
          onClick={onDeliver}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-black text-primary-foreground shadow-elegant disabled:opacity-60 active:scale-[0.98]"
        >
          <PackageCheck className="h-4 w-4" />
          {busy ? "..." : "تسليم الطلب"}
        </button>
      </div>
    </article>
  );
}

function Row({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-start gap-2 text-foreground">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <span className="flex-1">{label}</span>
    </div>
  );
}

// Extend Order to include coords columns for the driver dashboard fetch.
export type ActiveOrderColumns = keyof ActiveOrder;
