import { Link } from "@tanstack/react-router";
import { Star, Clock, MapPin, Heart } from "lucide-react";
import { toast } from "sonner";
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
      <div className="relative h-28 overflow-hidden sm:h-32">
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
            e.stopPropagation();
            const wasFav = fav;
            toggleFavStore(store.id);
            toast.success(wasFav ? "تمت الإزالة من المفضلة" : "تمت الإضافة إلى المفضلة");
          }}
          className="absolute top-2 left-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 backdrop-blur transition-transform hover:scale-110"
          aria-label="مفضلة"
        >
          <Heart
            className={`h-4 w-4 ${fav ? "fill-primary text-primary" : "text-foreground"}`}
            strokeWidth={2.2}
          />
        </button>
        <div className="absolute top-2 right-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${
              store.isOpen
                ? "bg-success text-success-foreground"
                : "bg-foreground/70 text-background"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {store.isOpen ? "مفتوح" : "مغلق"}
          </span>
        </div>
        <div className="absolute bottom-2 right-2">
          <div className="h-10 w-10 overflow-hidden rounded-2xl border-2 border-white bg-white shadow-elegant sm:h-11 sm:w-11">
            <img src={store.logo} alt="" className="h-full w-full object-cover" />
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 flex-1 text-sm font-bold text-foreground sm:text-base">
            {store.name}
          </h3>
          <div className="flex items-center gap-0.5 rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] font-bold text-foreground sm:px-2 sm:text-xs">
            <Star className="h-2.5 w-2.5 fill-accent text-accent sm:h-3 sm:w-3" />
            {store.rating}
          </div>
        </div>
        <p className="mt-1 line-clamp-1 text-[10px] text-muted-foreground sm:text-xs">
          {store.tags.join(" • ")}
        </p>
        <div className="mt-auto pt-2 flex items-center gap-2 text-[10px] font-semibold text-muted-foreground sm:text-[11px]">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" /> {formatMinutes(store.deliveryMin)}
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {formatDistanceKm(store.distanceKm)}
          </span>
        </div>

      </div>
    </Link>
  );
}
