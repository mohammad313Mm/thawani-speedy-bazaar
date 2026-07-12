import { useEffect, useState } from "react";
import { BANNERS } from "../lib/data";

export function BannerCarousel() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % BANNERS.length), 4500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative">
      <div className="overflow-hidden rounded-3xl">
        <div
          className="flex transition-transform duration-700 ease-out"
          style={{ transform: `translateX(${i * 100}%)` }}
        >
          {BANNERS.map((b) => (
            <div key={b.id} className="min-w-full">
              <div
                className={`relative flex h-40 items-center overflow-hidden rounded-3xl bg-gradient-to-br ${b.color} p-5 text-white`}
              >
                <div className="relative z-10 max-w-[65%]">
                  <h3 className="text-xl font-black leading-tight">{b.title}</h3>
                  <p className="mt-1 text-xs opacity-90">{b.subtitle}</p>
                  <button className="mt-3 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-primary shadow-elegant transition-transform hover:scale-105">
                    {b.cta}
                  </button>
                </div>
                <img
                  src={b.image}
                  alt=""
                  className="absolute left-0 top-0 h-full w-1/2 object-cover opacity-40"
                  loading="lazy"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex justify-center gap-1.5">
        {BANNERS.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setI(idx)}
            className={`h-1.5 rounded-full transition-all ${
              i === idx ? "w-6 bg-primary" : "w-1.5 bg-border"
            }`}
            aria-label={`الشريحة ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
