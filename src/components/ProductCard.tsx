import { Link } from "@tanstack/react-router";
import { Plus, Heart } from "lucide-react";
import type { Product } from "../lib/data";
import { formatIQD } from "../lib/format";
import { useCart } from "../lib/cart";

export function ProductCard({ product }: { product: Product }) {
  const { addItem, favorites, toggleFavorite } = useCart();
  const fav = favorites.includes(product.id);
  const hasDiscount = product.discountPrice && product.discountPrice < product.price;

  return (
    <div className="group relative flex overflow-hidden rounded-2xl bg-card shadow-card transition-all hover:shadow-elegant">
      <Link
        to="/product/$id"
        params={{ id: product.id }}
        className="flex flex-1 items-stretch gap-3 p-3"
      >
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-muted">
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          {hasDiscount && (
            <span className="absolute top-1 right-1 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
              خصم
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <h4 className="line-clamp-1 text-sm font-bold text-foreground">{product.name}</h4>
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
            {product.description}
          </p>
          <div className="mt-auto flex items-baseline gap-2">
            <span className="text-sm font-black text-primary">
              {formatIQD(product.discountPrice ?? product.price)}
            </span>
            {hasDiscount && (
              <span className="text-[11px] font-semibold text-muted-foreground line-through">
                {formatIQD(product.price)}
              </span>
            )}
          </div>
        </div>
      </Link>

      <div className="flex flex-col items-center justify-between p-2">
        <button
          onClick={() => toggleFavorite(product.id)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-muted transition-colors hover:bg-muted/80"
          aria-label="مفضلة"
        >
          <Heart
            className={`h-4 w-4 ${fav ? "fill-primary text-primary" : "text-foreground"}`}
            strokeWidth={2.2}
          />
        </button>
        <button
          onClick={() => addItem(product.id)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-elegant transition-transform hover:scale-110 active:scale-95"
          aria-label="أضف إلى السلة"
        >
          <Plus className="h-4 w-4" strokeWidth={3} />
        </button>
      </div>
    </div>
  );
}
