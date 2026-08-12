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
    <header className="sticky top-0 z-30 w-full border-b border-border/40 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-2 px-3 py-3 sm:gap-3 sm:px-4">
        <Link to="/" className="flex shrink-0 items-center gap-2" onClick={handleLogoClick}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary shadow-elegant ring-2 ring-primary/20 sm:h-10 sm:w-10">
            <img
              src={thawaniLogo.url}
              alt="شعار ثواني"
              className="h-full w-full object-cover"
              loading="eager"
            />
          </div>
          <span className="hidden text-lg font-black tracking-tight text-foreground xs:inline sm:inline">
            ثواني
          </span>
        </Link>


        {location && (
          <button
            onClick={onLocationClick}
            className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full bg-muted px-2.5 py-1.5 text-[11px] font-semibold text-foreground transition-colors hover:bg-muted/80 sm:px-3 sm:text-xs"
          >
            <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="truncate">{location}</span>
          </button>
        )}

        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          <Link
            to="/notifications"
            className="relative flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-muted/80 sm:h-10 sm:w-10"
          >
            <Bell className="h-5 w-5" strokeWidth={2.2} />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
          </Link>
          <Link
            to="/profile"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-muted/80 sm:h-10 sm:w-10"
          >
            <User className="h-5 w-5" strokeWidth={2.2} />
          </Link>
        </div>
      </div>
    </header>

  );
}
