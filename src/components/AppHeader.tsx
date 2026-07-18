import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, MapPin, User } from "lucide-react";
import { useRef } from "react";
import thawaniLogo from "@/assets/thawani-logo.png.asset.json";

interface HeaderProps {
  location?: string;
  onLocationClick?: () => void;
}

const HIDDEN_TAP_TARGET = 7;
const HIDDEN_TAP_WINDOW_MS = 5000;

export function AppHeader({ location, onLocationClick }: HeaderProps) {
  const navigate = useNavigate();
  const tapCountRef = useRef(0);
  const firstTapAtRef = useRef(0);

  const handleLogoClick = (e: React.MouseEvent) => {
    const now = Date.now();
    if (now - firstTapAtRef.current > HIDDEN_TAP_WINDOW_MS) {
      tapCountRef.current = 0;
      firstTapAtRef.current = now;
    }
    tapCountRef.current += 1;
    if (tapCountRef.current >= HIDDEN_TAP_TARGET) {
      e.preventDefault();
      tapCountRef.current = 0;
      firstTapAtRef.current = 0;
      navigate({ to: "/admin-login" });
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border/40 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="flex items-center gap-2" onClick={handleLogoClick}>
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-primary shadow-elegant ring-2 ring-primary/20">
            <img
              src={thawaniLogo.url}
              alt="شعار ثواني"
              className="h-full w-full object-cover"
              loading="eager"
            />
          </div>
          <span className="text-lg font-black tracking-tight text-foreground">ثواني</span>
        </Link>


        {location && (
          <button
            onClick={onLocationClick}
            className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted/80"
          >
            <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="truncate">{location}</span>
          </button>
        )}

        <div className="flex items-center gap-1.5">
          <Link
            to="/notifications"
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-muted/80"
          >
            <Bell className="h-5 w-5" strokeWidth={2.2} />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
          </Link>
          <Link
            to="/profile"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-muted/80"
          >
            <User className="h-5 w-5" strokeWidth={2.2} />
          </Link>
        </div>
      </div>
    </header>
  );
}
