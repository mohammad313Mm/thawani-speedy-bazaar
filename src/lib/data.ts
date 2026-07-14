export type CategoryKey = "restaurants" | "grocery" | "cosmetics" | "desserts";

export interface Category {
  key: CategoryKey;
  name: string;
  description: string;
  icon: string; // emoji
  color: string;
}

export interface Store {
  id: string;
  category: CategoryKey;
  name: string;
  cover: string;
  logo: string;
  rating: number;
  reviews: number;
  distanceKm: number;
  deliveryMin: number;
  deliveryFee: number;
  minOrder: number;
  isOpen: boolean;
  tags: string[];
  description: string;
  address: string;
  phone: string;
}

export interface Product {
  id: string;
  storeId: string;
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  image: string;
  category: string;
  rating: number;
  prepMin: number;
  available: boolean;
  options?: { name: string; required: boolean; choices: { name: string; price: number }[] }[];
}

export const CATEGORIES: Category[] = [
  {
    key: "restaurants",
    name: "المطاعم",
    description: "أشهى الأطباق قريبة منك",
    icon: "🍔",
    color: "from-[oklch(0.65_0.22_27)] to-[oklch(0.72_0.19_45)]",
  },
  {
    key: "grocery",
    name: "البقالة",
    description: "كل احتياجات المنزل اليومية",
    icon: "🛒",
    color: "from-[oklch(0.78_0.16_75)] to-[oklch(0.85_0.14_85)]",
  },
  {
    key: "cosmetics",
    name: "الكوزمتك",
    description: "منتجات التجميل والعناية",
    icon: "💄",
    color: "from-[oklch(0.68_0.2_350)] to-[oklch(0.75_0.16_20)]",
  },
  {
    key: "desserts",
    name: "الحلويات والمرطبات",
    description: "حلويات ومشروبات باردة ومنعشة",
    icon: "🍰",
    color: "from-[oklch(0.72_0.18_15)] to-[oklch(0.78_0.16_320)]",
  },
];

export function categoryByKey(key: string): Category | undefined {
  return CATEGORIES.find((c) => c.key === key);
}

const img = (seed: string, w = 800, h = 500) =>
  `https://images.unsplash.com/${seed}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;

export const STORES: Store[] = [];

export const PRODUCTS: Product[] = [];


export const BANNERS = [
  {
    id: "b1",
    title: "خصم ٣٠٪ على المطاعم",
    subtitle: "لفترة محدودة — استخدم كود THAWANI30",
    image: img("photo-1414235077428-338989a2e8c0"),
    cta: "اطلب الآن",
    color: "from-[oklch(0.55_0.22_27)] to-[oklch(0.72_0.18_55)]",
  },
  {
    id: "b2",
    title: "توصيل مجاني للبقالة",
    subtitle: "على أول طلبين هذا الأسبوع",
    image: img("photo-1542838132-92c53300491e"),
    cta: "اكتشف",
    color: "from-[oklch(0.72_0.18_55)] to-[oklch(0.85_0.14_85)]",
  },
  {
    id: "b3",
    title: "حلويات ومشروبات منعشة",
    subtitle: "تشكيلة جديدة من أفضل المتاجر",
    image: img("photo-1488477181946-6428a0291777"),
    cta: "تسوق الآن",
    color: "from-[oklch(0.68_0.2_350)] to-[oklch(0.55_0.22_27)]",
  },
];

export function storesByCategory(key: CategoryKey) {
  return STORES.filter((s) => s.category === key);
}

export function storeById(id: string) {
  return STORES.find((s) => s.id === id);
}

export function productsByStore(storeId: string) {
  return PRODUCTS.filter((p) => p.storeId === storeId);
}

export function productById(id: string) {
  return PRODUCTS.find((p) => p.id === id);
}
