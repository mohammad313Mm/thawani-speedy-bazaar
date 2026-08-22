import { Link } from "@tanstack/react-router";
import type { Category } from "../lib/data";
import { prefetchDbStores } from "../lib/db-stores";


function CardBody({ category, cta }: { category: Category; cta: string }) {
  return (
    <>
      <div
        className={`absolute inset-0 -z-10 bg-gradient-to-br ${category.color}`}
        aria-hidden
      />
      <div className="absolute -bottom-5 -left-5 text-[80px] leading-none opacity-25 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
        {category.icon}
      </div>
      <div className="relative">
        <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/25 backdrop-blur text-xl">
          {category.icon}
        </div>
        <h3 className="text-base font-black">{category.name}</h3>
        <p className="mt-0.5 text-[11px] opacity-90">{category.description}</p>
      </div>
      <div className="relative mt-2.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-semibold backdrop-blur">
          {cta}
        </span>
      </div>
    </>
  );
}

export function CategoryCard({ category }: { category: Category }) {
  const isFreelance = category.key === "freelance";
  const isTaxi = category.key === "taxi";
  const cta = isFreelance ? "اطلب توصيل" : isTaxi ? "اطلب تكسي" : "تصفح المتاجر";
  const className =
    "group relative flex flex-col justify-between overflow-hidden rounded-3xl p-4 text-white shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-elegant";

  if (isFreelance) {
    return (
      <Link to="/freelance-agent" className={className}>
        <CardBody category={category} cta={cta} />
      </Link>
    );
  }

  if (isTaxi) {
    return (
      <Link to="/taxi" className={className}>
        <CardBody category={category} cta={cta} />
      </Link>
    );
  }

  return (
    <Link
      to="/category/$key"
      params={{ key: category.key }}
      className={className}
      onMouseEnter={() => void prefetchDbStores()}
      onTouchStart={() => void prefetchDbStores()}
    >
      <CardBody category={category} cta={cta} />
    </Link>

  );
}
