import { useEffect, useState } from "react";
import { supabase } from "../integrations/supabase/client";

type Ad = { id: string; title: string; image_url: string; link_url: string | null };

export function BannerCarousel() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [i, setI] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from("advertisements")
        .select("id, title, image_url, link_url")
        .eq("is_active", true)
        .eq("position", "home_top")
        .order("sort_order");
      if (active) {
        setAds((data ?? []) as Ad[]);
        setI(0);
      }
    };
    load();

    const channel = supabase
      .channel("advertisements-home")
      .on("postgres_changes", { event: "*", schema: "public", table: "advertisements" }, () => load())
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (ads.length < 2) return;
    const t = setInterval(() => setI((n) => (n + 1) % ads.length), 4500);
    return () => clearInterval(t);
  }, [ads.length]);

  if (ads.length === 0) return null;

  return (
    <div className="relative">
      <div className="overflow-hidden rounded-3xl">
        <div
          className="flex transition-transform duration-700 ease-out"
          style={{ transform: `translateX(${i * 100}%)` }}
        >
          {ads.map((ad) => {
            const inner = (
              <div className="relative flex h-40 items-center overflow-hidden rounded-3xl">
                <img src={ad.image_url} alt={ad.title} className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-l from-black/60 via-black/20 to-transparent" />
                <div className="relative z-10 max-w-[65%] p-5 text-white">
                  <h3 className="text-xl font-black leading-tight">{ad.title}</h3>
                </div>
              </div>
            );
            return (
              <div key={ad.id} className="min-w-full">
                {ad.link_url ? (
                  <a href={ad.link_url} target="_blank" rel="noopener noreferrer">
                    {inner}
                  </a>
                ) : (
                  inner
                )}
              </div>
            );
          })}
        </div>
      </div>
      {ads.length > 1 && (
        <div className="mt-3 flex justify-center gap-1.5">
          {ads.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setI(idx)}
              className={`h-1.5 rounded-full transition-all ${i === idx ? "w-6 bg-primary" : "w-1.5 bg-border"}`}
              aria-label={`الشريحة ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
