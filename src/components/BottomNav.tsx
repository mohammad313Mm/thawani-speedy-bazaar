import { Link, useRouterState } from "@tanstack/react-router";
import { Home, ShoppingBag, ClipboardList, Heart, User } from "lucide-react";
import { useCart } from "../lib/cart";

const tabs = [
  { to: "/", icon: Home, label: "الرئيسية", match: (p: string) => p === "/" },
  { to: "/orders", icon: ClipboardList, label: "طلباتي", match: (p: string) => p.startsWith("/orders") },
  { to: "/cart", icon: ShoppingBag, label: "السلة", match: (p: string) => p.startsWith("/cart") },
  { to: "/favorites", icon: Heart, label: "المفضلة", match: (p: string) => p.startsWith("/favorites") },
  { to: "/profile", icon: User, label: "حسابي", match: (p: string) => p.startsWith("/profile") },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { itemCount } = useCart();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 w-full border-t border-border bg-card/95 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-2xl items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)] pt-2 sm:px-2">
        {tabs.map((t) => {
          const active = t.match(pathname);
          const Icon = t.icon;
          const isCart = t.to === "/cart";
          return (
            <Link
              key={t.to}
              to={t.to}
              className="group relative flex min-w-0 flex-1 flex-col items-center gap-1 py-1.5"
            >
              <div
                className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition-all duration-300 sm:h-11 sm:w-11 ${
                  active
                    ? "bg-primary text-primary-foreground shadow-elegant scale-105"
                    : "text-muted-foreground group-hover:text-foreground"
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={2.2} />
                {isCart && itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground shadow-soft">
                    {itemCount}
                  </span>
                )}
              </div>
              <span
                className={`max-w-full truncate text-[10px] font-semibold transition-colors xs:text-[11px] ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {t.label}
              </span>
            </Link>
          );
        })}

      </div>
    </nav>
  );
}
