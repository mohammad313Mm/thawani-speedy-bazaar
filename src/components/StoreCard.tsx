import { Link } from "@tanstack/react-router";
import { Star, Clock, MapPin, Heart } from "lucide-react";
import type { Store } from "../lib/data";
import { formatDistanceKm, formatIQD, formatMinutes } from "../lib/format";
import { useCart } from "../lib/cart";

export function StoreCard({ store }: { store: Store }) {
  const { favStores, toggleFavStore } = useCart();
  const fav = favStores.includes(store.id);
  return (
    <Link
      to="/store/$id"
      params={{ id: store.id }}
      className="group flex h-full flex-col overflow-hidden rounded-3xl bg-card shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-elegant"
    >
      <div className="relative h-40 overflow-hidden">
        <img
          src={store.cover}
          alt={store.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/0 to-black/10" />
        <button
          onClick={(e) => {
            e.preventDefault();
            toggleFavStore(store.id);
          }}
          className="absolute top-3 left-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 backdrop-blur transition-transform hover:scale-110"
          aria-label="مفضلة"
        >
          <Heart
            className={`h-4 w-4 ${fav ? "fill-primary text-primary" : "text-foreground"}`}
            strokeWidth={2.2}
          />
        </button>
        <div className="absolute top-3 right-3">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
              store.isOpen
                ? "bg-success text-success-foreground"
                : "bg-foreground/70 text-background"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {store.isOpen ? "مفتوح" : "مغلق"}
          </span>
        </div>
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          <div className="h-12 w-12 overflow-hidden rounded-2xl border-2 border-white bg-white shadow-elegant">
            <img src={store.logo} alt="" className="h-full w-full object-cover" />
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-1 flex-1 text-base font-bold text-foreground">{store.name}</h3>
          <div className="flex items-center gap-1 rounded-full bg-accent/20 px-2 py-0.5 text-xs font-bold text-foreground">
            <Star className="h-3 w-3 fill-accent text-accent" />
            {store.rating}
          </div>
        </div>
        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
          {store.tags.join(" • ")}
        </p>
        <div className="mt-auto pt-3 flex items-center gap-3 text-[11px] font-semibold text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> {formatMinutes(store.deliveryMin)}
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> {formatDistanceKm(store.distanceKm)}
          </span>
          <span className="mr-auto inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] text-foreground">
            توصيل {formatIQD(store.deliveryFee)}
          </span>
        </div>
      </div>
    </Link>
  );
}
