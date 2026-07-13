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

export const STORES: Store[] = [
  {
    id: "s1",
    category: "restaurants",
    name: "مطعم بغداد الأصيل",
    cover: img("photo-1552566626-52f8b828add9"),
    logo: img("photo-1517248135467-4c7edcad34c4", 200, 200),
    rating: 4.8,
    reviews: 1240,
    distanceKm: 1.2,
    deliveryMin: 25,
    deliveryFee: 2000,
    minOrder: 5000,
    isOpen: true,
    tags: ["مشاوي", "كباب", "عراقي"],
    description: "أفضل المشاوي العراقية الأصيلة على الفحم منذ عام ١٩٩٥.",
    address: "بابل — الهاشمية، شارع الرئيسي",
    phone: "07701234567",
  },
  {
    id: "s2",
    category: "restaurants",
    name: "برجر ستيشن",
    cover: img("photo-1568901346375-23c9450c58cd"),
    logo: img("photo-1550547660-d9450f859349", 200, 200),
    rating: 4.6,
    reviews: 820,
    distanceKm: 2.4,
    deliveryMin: 30,
    deliveryFee: 2500,
    minOrder: 7000,
    isOpen: true,
    tags: ["برجر", "بطاطا", "مشروبات"],
    description: "برجر لحم واغيو طازج مع صلصات خاصة.",
    address: "بابل — الحلة، شارع ٦٠",
    phone: "07711234567",
  },
  {
    id: "s3",
    category: "restaurants",
    name: "بيتزا روما",
    cover: img("photo-1513104890138-7c749659a591"),
    logo: img("photo-1571066811602-716837d681de", 200, 200),
    rating: 4.5,
    reviews: 640,
    distanceKm: 3.1,
    deliveryMin: 35,
    deliveryFee: 3000,
    minOrder: 8000,
    isOpen: false,
    tags: ["بيتزا", "إيطالي", "معكرونة"],
    description: "بيتزا إيطالية أصلية على فرن الحطب.",
    address: "بابل — الحلة، شارع الجزائر",
    phone: "07721234567",
  },
  {
    id: "s4",
    category: "grocery",
    name: "بقالة الشام",
    cover: img("photo-1542838132-92c53300491e"),
    logo: img("photo-1608198093002-ad4e005484ec", 200, 200),
    rating: 4.9,
    reviews: 2100,
    distanceKm: 0.8,
    deliveryMin: 20,
    deliveryFee: 1500,
    minOrder: 3000,
    isOpen: true,
    tags: ["مواد غذائية", "خضروات", "منظفات"],
    description: "كل احتياجات المنزل من مواد غذائية ومنظفات بأسعار منافسة.",
    address: "بابل — الهاشمية، السوق الكبير",
    phone: "07731234567",
  },
  {
    id: "s5",
    category: "grocery",
    name: "سوبر ماركت الأمير",
    cover: img("photo-1578916171728-46686eac8d58"),
    logo: img("photo-1587248720327-8eb72564be1e", 200, 200),
    rating: 4.7,
    reviews: 980,
    distanceKm: 1.9,
    deliveryMin: 25,
    deliveryFee: 2000,
    minOrder: 5000,
    isOpen: true,
    tags: ["ألبان", "معلبات", "مشروبات"],
    description: "تشكيلة واسعة من المنتجات الغذائية والمنزلية.",
    address: "بابل — الحلة، شارع ٤٠",
    phone: "07741234567",
  },
  {
    id: "s6",
    category: "cosmetics",
    name: "لمسة جمال",
    cover: img("photo-1522337360788-8b13dee7a37e"),
    logo: img("photo-1596462502278-27bfdc403348", 200, 200),
    rating: 4.6,
    reviews: 540,
    distanceKm: 2.1,
    deliveryMin: 40,
    deliveryFee: 3000,
    minOrder: 10000,
    isOpen: true,
    tags: ["ميك اب", "عطور", "عناية"],
    description: "أرقى ماركات مستحضرات التجميل العالمية.",
    address: "بابل — الحلة، مول النخيل",
    phone: "07751234567",
  },
  {
    id: "s7",
    category: "cosmetics",
    name: "بيوتي بلس",
    cover: img("photo-1487412720507-e7ab37603c6f"),
    logo: img("photo-1631730359585-38a4935cbec4", 200, 200),
    rating: 4.4,
    reviews: 320,
    distanceKm: 3.6,
    deliveryMin: 45,
    deliveryFee: 3500,
    minOrder: 8000,
    isOpen: true,
    tags: ["عناية بالبشرة", "شعر", "أظافر"],
    description: "منتجات كورية وعالمية للعناية بالبشرة والشعر.",
    address: "بابل — الحلة، شارع ٨٠",
    phone: "07761234567",
  },
  {
    id: "s8",
    category: "desserts",
    name: "حلويات الأمير",
    cover: img("photo-1488477181946-6428a0291777"),
    logo: img("photo-1587248720327-8eb72564be1e", 200, 200),
    rating: 4.8,
    reviews: 760,
    distanceKm: 1.6,
    deliveryMin: 25,
    deliveryFee: 2000,
    minOrder: 5000,
    isOpen: true,
    tags: ["كيك", "بقلاوة", "كنافة"],
    description: "أفخر الحلويات الشرقية والغربية الطازجة.",
    address: "بابل — الحلة، شارع ٤٠",
    phone: "07781234567",
  },
  {
    id: "s9",
    category: "desserts",
    name: "فريش جوس",
    cover: img("photo-1544145945-f90425340c7e"),
    logo: img("photo-1600271886742-f049b968cf25", 200, 200),
    rating: 4.7,
    reviews: 410,
    distanceKm: 2.0,
    deliveryMin: 20,
    deliveryFee: 1500,
    minOrder: 3000,
    isOpen: true,
    tags: ["عصائر", "موهيتو", "مشروبات باردة"],
    description: "عصائر طازجة ومشروبات باردة منعشة.",
    address: "بابل — الحلة، شارع ٦٠",
    phone: "07791234567",
  },
];

export const PRODUCTS: Product[] = [
  // s1 restaurant
  {
    id: "p1",
    storeId: "s1",
    name: "كباب مشوي على الفحم",
    description: "كباب لحم غنم طازج مع بصل مشوي وخبز صاج.",
    price: 12000,
    discountPrice: 10000,
    image: img("photo-1633945274309-2c16c37e9613"),
    category: "المشاوي",
    rating: 4.9,
    prepMin: 20,
    available: true,
    options: [
      {
        name: "الحجم",
        required: true,
        choices: [
          { name: "عادي", price: 0 },
          { name: "دبل", price: 4000 },
        ],
      },
      {
        name: "إضافات",
        required: false,
        choices: [
          { name: "بصل مشوي", price: 500 },
          { name: "طرشي", price: 1000 },
        ],
      },
    ],
  },
  {
    id: "p2",
    storeId: "s1",
    name: "تكة دجاج",
    description: "قطع دجاج متبلة ومشوية على الفحم.",
    price: 10000,
    image: img("photo-1626082927389-6cd097cdc6ec"),
    category: "المشاوي",
    rating: 4.7,
    prepMin: 18,
    available: true,
  },
  {
    id: "p3",
    storeId: "s1",
    name: "مقلوبة باللحم",
    description: "أرز عراقي أصيل مع لحم غنم وخضار مقلاة.",
    price: 15000,
    image: img("photo-1546833999-b9f581a1996d"),
    category: "الأطباق الرئيسية",
    rating: 4.8,
    prepMin: 25,
    available: true,
  },
  // s2 burger
  {
    id: "p4",
    storeId: "s2",
    name: "كلاسيك برجر",
    description: "برجر لحم بقري ١٥٠ جرام مع جبن شيدر وخس وطماطم.",
    price: 8000,
    image: img("photo-1568901346375-23c9450c58cd"),
    category: "برجر",
    rating: 4.6,
    prepMin: 15,
    available: true,
  },
  {
    id: "p5",
    storeId: "s2",
    name: "دبل تشيز برجر",
    description: "قطعتان لحم بقري مع جبن مضاعف وصلصة خاصة.",
    price: 12000,
    discountPrice: 10500,
    image: img("photo-1550317138-10000687a72b"),
    category: "برجر",
    rating: 4.8,
    prepMin: 18,
    available: true,
  },
  {
    id: "p6",
    storeId: "s2",
    name: "بطاطا كبيرة",
    description: "بطاطا مقلية ذهبية مقرمشة.",
    price: 3000,
    image: img("photo-1541592106381-b31e9677c0e5"),
    category: "الجانبيات",
    rating: 4.5,
    prepMin: 8,
    available: true,
  },
  // s3 pizza
  {
    id: "p7",
    storeId: "s3",
    name: "بيتزا مارغريتا",
    description: "صلصة طماطم، موزاريلا طازجة، وريحان.",
    price: 12000,
    image: img("photo-1604382354936-07c5d9983bd3"),
    category: "بيتزا",
    rating: 4.6,
    prepMin: 25,
    available: true,
  },
  {
    id: "p8",
    storeId: "s3",
    name: "بيتزا بيبروني",
    description: "بيبروني إيطالي أصلي مع جبن موزاريلا.",
    price: 14000,
    image: img("photo-1565299624946-b28f40a0ae38"),
    category: "بيتزا",
    rating: 4.7,
    prepMin: 25,
    available: true,
  },
  // s4 grocery
  {
    id: "p9",
    storeId: "s4",
    name: "بيض طازج — ٣٠ حبة",
    description: "بيض طازج من مزارع محلية.",
    price: 6500,
    image: img("photo-1518569656558-1f25e69d93d7"),
    category: "ألبان وبيض",
    rating: 4.9,
    prepMin: 10,
    available: true,
  },
  {
    id: "p10",
    storeId: "s4",
    name: "زيت طعام — ٥ لتر",
    description: "زيت دوار الشمس صافي عالي الجودة.",
    price: 12500,
    image: img("photo-1474979266404-7eaacbcd87c5"),
    category: "زيوت وسمن",
    rating: 4.7,
    prepMin: 10,
    available: true,
  },
  // s5 grocery
  {
    id: "p11",
    storeId: "s5",
    name: "أرز بسمتي — ٥ كغم",
    description: "أرز بسمتي هندي طويل الحبة.",
    price: 18000,
    discountPrice: 15500,
    image: img("photo-1586201375761-83865001e31c"),
    category: "أرز وحبوب",
    rating: 4.8,
    prepMin: 10,
    available: true,
  },
  {
    id: "p12",
    storeId: "s5",
    name: "مشروبات غازية — كرتون ٢٤",
    description: "تشكيلة مشروبات غازية كرتون كامل.",
    price: 15000,
    image: img("photo-1622483767028-3f66f32aef97"),
    category: "مشروبات",
    rating: 4.6,
    prepMin: 10,
    available: true,
  },
  // s6 cosmetics
  {
    id: "p13",
    storeId: "s6",
    name: "أحمر شفاه مات",
    description: "أحمر شفاه طويل الثبات — درجات متعددة.",
    price: 18000,
    image: img("photo-1586495777744-4413f21062fa"),
    category: "ميك اب",
    rating: 4.6,
    prepMin: 30,
    available: true,
  },
  {
    id: "p14",
    storeId: "s6",
    name: "عطر نسائي فاخر",
    description: "عطر شرقي بلمسات الفانيلا والعنبر.",
    price: 65000,
    discountPrice: 55000,
    image: img("photo-1541643600914-78b084683601"),
    category: "عطور",
    rating: 4.8,
    prepMin: 30,
    available: true,
  },
  // s7 cosmetics
  {
    id: "p15",
    storeId: "s7",
    name: "سيروم فيتامين سي",
    description: "سيروم مضاد للأكسدة لتوحيد لون البشرة.",
    price: 35000,
    image: img("photo-1620916566398-39f1143ab7be"),
    category: "عناية بالبشرة",
    rating: 4.7,
    prepMin: 40,
    available: true,
  },
  // s8 desserts
  {
    id: "p16",
    storeId: "s8",
    name: "كنافة نابلسية",
    description: "كنافة بالجبن مع قطر — كيلو غرام.",
    price: 15000,
    discountPrice: 12500,
    image: img("photo-1519676867240-f03562e64548"),
    category: "حلويات شرقية",
    rating: 4.9,
    prepMin: 20,
    available: true,
  },
  {
    id: "p17",
    storeId: "s8",
    name: "بقلاوة مشكلة",
    description: "تشكيلة بقلاوة فستق وجوز — نصف كيلو.",
    price: 12000,
    image: img("photo-1571877227200-a0d98ea607e9"),
    category: "حلويات شرقية",
    rating: 4.8,
    prepMin: 15,
    available: true,
  },
  // s9 desserts / drinks
  {
    id: "p18",
    storeId: "s9",
    name: "موهيتو فراولة",
    description: "مشروب منعش بالفراولة والنعناع والليمون.",
    price: 5000,
    discountPrice: 4000,
    image: img("photo-1544145945-f90425340c7e"),
    category: "مشروبات باردة",
    rating: 4.8,
    prepMin: 8,
    available: true,
  },
  {
    id: "p19",
    storeId: "s9",
    name: "عصير برتقال طازج",
    description: "عصير برتقال طبيعي ١٠٠٪ بدون سكر مضاف.",
    price: 4000,
    image: img("photo-1600271886742-f049b968cf25"),
    category: "عصائر طازجة",
    rating: 4.7,
    prepMin: 6,
    available: true,
  },
];

export const BANNERS = [
  {
    id: "b1",
    title: "خصم ٣٠٪ على المطاعم",
    subtitle: "لفترة محدودة — استخدم كود ALSAFI30",
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
