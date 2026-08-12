import { Link } from "@tanstack/react-router";
import type { Category } from "../lib/data";

function CardBody({ category, cta }: { category: Category; cta: string }) {
  return (
    <>
      <div
        className={`absolute inset-0 -z-10 bg-gradient-to-br ${category.color}`}
        aria-hidden
      />
      <div className="absolute -bottom-6 -left-6 text-[110px] leading-none opacity-30 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
        {category.icon}
      </div>
      <div className="relative">
        <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/25 backdrop-blur text-2xl">
          {category.icon}
        </div>
        <h3 className="text-lg font-black">{category.name}</h3>
        <p className="mt-0.5 text-xs opacity-90">{category.description}</p>
      </div>
      <div className="relative mt-3">
        <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold backdrop-blur">
          {cta}
        </span>
      </div>
    </>
  );
}

export function CategoryCard({ category }: { category: Category }) {
  const isFreelance = category.key === "freelance";
  const cta = isFreelance ? "اطلب توصيل" : "تصفح المتاجر";
  const className =
    "group relative flex flex-col justify-between overflow-hidden rounded-3xl p-5 text-white shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-elegant";

  if (isFreelance) {
    return (
      <Link to="/freelance-agent" className={className}>
        <CardBody category={category} cta={cta} />
      </Link>
    );
  }

  return (
    <Link to="/category/$key" params={{ key: category.key }} className={className}>
      <CardBody category={category} cta={cta} />
    </Link>
  );
}
