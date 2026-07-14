import { useEffect, useState } from "react";
import { supabase } from "../integrations/supabase/client";
import { BANNERS } from "../lib/data";

type Ad = { id: string; title: string; image_url: string; link_url: string | null };

export function BannerCarousel() {
  const [ads, setAds] = useState<Ad[] | null>(null);
  const [i, setI] = useState(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("advertisements")
        .select("id, title, image_url, link_url")
        .eq("is_active", true)
        .eq("position", "home_top")
        .order("sort_order");
      setAds((data ?? []) as Ad[]);
    })();
  }, []);

  const count = ads && ads.length > 0 ? ads.length : BANNERS.length;
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % count), 4500);
    return () => clearInterval(t);
  }, [count]);

  if (ads && ads.length > 0) {
    return (
      <div className="relative">
        <div className="overflow-hidden rounded-3xl">
          <div className="flex transition-transform duration-700 ease-out"
            style={{ transform: `translateX(${i * 100}%)` }}>
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
                    <a href={ad.link_url} target="_blank" rel="noopener noreferrer">{inner}</a>
                  ) : inner}
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-3 flex justify-center gap-1.5">
          {ads.map((_, idx) => (
            <button key={idx} onClick={() => setI(idx)}
              className={`h-1.5 rounded-full transition-all ${i === idx ? "w-6 bg-primary" : "w-1.5 bg-border"}`}
              aria-label={`الشريحة ${idx + 1}`} />
          ))}
        </div>
      </div>
    );
  }

  // Fallback: static banners when there are no ads yet
  return (
    <div className="relative">
      <div className="overflow-hidden rounded-3xl">
        <div className="flex transition-transform duration-700 ease-out"
          style={{ transform: `translateX(${i * 100}%)` }}>
          {BANNERS.map((b) => (
            <div key={b.id} className="min-w-full">
              <div className={`relative flex h-40 items-center overflow-hidden rounded-3xl bg-gradient-to-br ${b.color} p-5 text-white`}>
                <div className="relative z-10 max-w-[65%]">
                  <h3 className="text-xl font-black leading-tight">{b.title}</h3>
                  <p className="mt-1 text-xs opacity-90">{b.subtitle}</p>
                  <button className="mt-3 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-primary shadow-elegant transition-transform hover:scale-105">
                    {b.cta}
                  </button>
                </div>
                <img src={b.image} alt="" className="absolute left-0 top-0 h-full w-1/2 object-cover opacity-40" loading="lazy" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex justify-center gap-1.5">
        {BANNERS.map((_, idx) => (
          <button key={idx} onClick={() => setI(idx)}
            className={`h-1.5 rounded-full transition-all ${i === idx ? "w-6 bg-primary" : "w-1.5 bg-border"}`}
            aria-label={`الشريحة ${idx + 1}`} />
        ))}
      </div>
    </div>
  );
}
