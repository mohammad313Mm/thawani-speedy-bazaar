import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Shield, Calendar } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "سياسة الخصوصية — ثواني" },
      { name: "description", content: "سياسة الخصوصية لتطبيق ثواني للتسوق والتوصيل." },
      { property: "og:title", content: "سياسة الخصوصية — ثواني" },
      { property: "og:description", content: "سياسة الخصوصية لتطبيق ثواني للتسوق والتوصيل." },
    ],
  }),
  component: PrivacyPage,
});

const LAST_UPDATED = "2026-08-14";

const arSections = [
  {
    title: "١. مقدمة",
    content: [
      "مرحباً بك في ثواني. نحن نحترم خصوصيتك وملتزمون بحماية معلوماتك الشخصية.",
      "توضح هذه السياسة كيفية جمع واستخدام وحماية بياناتك عند استخدامك لتطبيق ثواني.",
      "باستخدامك للتطبيق، فإنك توافق على Lovable Cloud وخدمات Backend (قاعدة البيانات والمصادقة) تُستخدم لتشغيل التطبيق، وأنك توافق على هذه السياسة.",
    ],
  },
  {
    title: "٢. المعلومات التي نجمعها",
    content: [
      "قد نجمع المعلومات التالية:",
      "• الاسم الكامل",
      "• رقم الهاتف",
      "• عنوان التوصيل",
      "• الموقع الجغرافي (فقط بإذنك)",
      "• معلومات الحساب",
      "• سجل الطلبات",
      "• معلومات الدفع (إن توفرت)",
    ],
  },
  {
    title: "٣. كيف نستخدم معلوماتك",
    content: [
      "نستخدم المعلومات التي نجمعها فقط للأغراض التالية:",
      "• إنشاء وإدارة حسابات المستخدمين",
      "• معالجة طلبات العملاء",
      "• توصيل الطلبات",
      "• تحسين أداء التطبيق",
      "• خدمة العملاء والدعم",
      "• إرسال إشعارات حالة الطلب",
      "• إرسال العروض والترويجات (عندما يكون ذلك منطبقاً)",
    ],
  },
  {
    title: "٤. مشاركة المعلومات",
    content: [
      "لا نقوم أبداً ببيع معلوماتك الشخصية.",
      "قد نشارك المعلومات فقط مع:",
      "• المتاجر التي تُحضّر طلباتك",
      "• مندوبي التوصيل الذين ينفذون عمليات التوصيل",
      "• الجهات الحكومية عندما يتطلب ذلك القانون",
    ],
  },
  {
    title: "٥. حماية البيانات",
    content: [
      "نحمي معلوماتك باستخدام:",
      "• تشفير كلمات المرور",
      "• اتصالات HTTPS آمنة",
      "• خوادم محمية",
      "• وصول إداري مقيد",
      "• معايير أمان حديثة",
    ],
  },
  {
    title: "٦. إذن الموقع الجغرافي",
    content: [
      "نستخدم إذن الموقع الجغرافي فقط من أجل:",
      "• تحديد عناوين التوصيل",
      "• عرض المتاجر القريبة منك",
      "• تحسين دقة التوصيل",
      "يتم طلب الوصول إلى الموقع فقط بعد الحصول على إذنك الصريح.",
    ],
  },
  {
    title: "٧. ملفات تعريف الارتباط والتقنيات المشابهة",
    content: [
      "قد يستخدم التطبيق ملفات تعريف الارتباط أو تقنيات مشابهة لتحسين الأداء وتعزيز تجربة المستخدم.",
    ],
  },
  {
    title: "٨. حقوق المستخدم",
    content: [
      "لديك الحق في:",
      "• الاطلاع على معلوماتك الشخصية",
      "• تحديث معلومات حسابك",
      "• طلب حذف حسابك",
      "• التواصل مع خدمة العملاء بخصوص الخصوصية",
    ],
  },
  {
    title: "٩. تحديثات سياسة الخصوصية",
    content: [
      "قد يتم تحديث هذه السياسة بشكل دوري. سيتم إشعارك داخل التطبيق عند إجراء تغييرات جوهرية.",
    ],
  },
  {
    title: "١٠. حذف الحساب وبيانات المستخدم",
    content: [
      "نحن نحترم خصوصيتك بشكل كامل؛ لذلك نوفر لك حرية التحكم التامة بحسابك. يمكنك في أي وقت اختيار \"حذف الحساب\" من إعدادات حسابك، وسيقوم النظام فوراً وبشكل نهائي بحذف جميع بياناتك الشخصية، معلومات الاتصال، وسجل نشاطك من قواعد بياناتنا لضمان أمان خصوصيتك.",
      "بمجرد تأكيد عملية الحذف، لا يمكن استرجاع الحساب أو البيانات المحذوفة، لذا تأكد من رغبتك النهائية قبل المتابعة.",
    ],
  },
];

const enSections = [
  {
    title: "1. Introduction",
    content: [
      "Welcome to Thawani. We respect your privacy and are committed to protecting your personal information.",
      "This policy explains how we collect, use, and protect your data when you use the Thawani app.",
      "By using the app, you agree that Lovable Cloud and Backend services (database and authentication) power the app, and you consent to this policy.",
    ],
  },
  {
    title: "2. Information We Collect",
    content: [
      "We may collect the following information:",
      "• Full Name",
      "• Phone Number",
      "• Delivery Address",
      "• Geographic Location (only with your permission)",
      "• Account Information",
      "• Order History",
      "• Payment Information (if available)",
    ],
  },
  {
    title: "3. How We Use Your Information",
    content: [
      "Collected information is used only for:",
      "• Creating and managing accounts",
      "• Processing customer orders",
      "• Delivering orders",
      "• Improving app performance",
      "• Customer support",
      "• Sending order status notifications",
      "• Sending promotions and offers (when applicable)",
    ],
  },
  {
    title: "4. Information Sharing",
    content: [
      "Your personal information is never sold.",
      "Information may only be shared with:",
      "• Stores preparing your orders",
      "• Delivery drivers completing deliveries",
      "• Government authorities when required by law",
    ],
  },
  {
    title: "5. Data Protection",
    content: [
      "Your information is protected using:",
      "• Password Encryption",
      "• Secure HTTPS Connections",
      "• Protected Servers",
      "• Restricted Administrative Access",
      "• Modern Security Standards",
    ],
  },
  {
    title: "6. Location Permission",
    content: [
      "Location permission is used only for:",
      "• Determining delivery addresses",
      "• Displaying nearby stores",
      "• Improving delivery accuracy",
      "Location access is requested only after obtaining your explicit permission.",
    ],
  },
  {
    title: "7. Cookies & Similar Technologies",
    content: [
      "The app may use cookies or similar technologies to improve performance and enhance the user experience.",
    ],
  },
  {
    title: "8. User Rights",
    content: [
      "You have the right to:",
      "• View your personal information",
      "• Update your account information",
      "• Request account deletion",
      "• Contact customer support regarding privacy",
    ],
  },
  {
    title: "9. Privacy Policy Updates",
    content: [
      "This Privacy Policy may be updated periodically. You will be notified inside the app whenever significant changes are made.",
    ],
  },
  {
    title: "10. Account Deletion & User Data",
    content: [
      "We fully respect your privacy, which is why we give you complete control over your account. At any time, you can choose \"Delete Account\" from your account settings. The system will immediately and permanently delete all your personal data, contact information, and activity history from our databases to ensure your privacy remains secure.",
      "Once deletion is confirmed, the account and deleted data cannot be recovered. Please make sure you are certain before proceeding.",
    ],
  },
];

function PrivacyPage() {
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const sections = lang === "ar" ? arSections : enSections;
  const isAr = lang === "ar";

  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-background pb-24" dir={isAr ? "rtl" : "ltr"}>
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-xl">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <Link
            to="/profile"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-muted/80"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="flex-1 text-lg font-black text-foreground">
            {isAr ? "سياسة الخصوصية" : "Privacy Policy"}
          </h1>
          <div className="flex items-center rounded-full border border-border bg-background p-1">
            <button
              onClick={() => setLang("ar")}
              className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${
                isAr ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground"
              }`}
            >
              عربي
            </button>
            <button
              onClick={() => setLang("en")}
              className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${
                !isAr ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground"
              }`}
            >
              EN
            </button>
          </div>
        </div>
      </header>

      <main className="space-y-4 px-4 py-5">
        {/* Hero / last updated */}
        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary/80 p-6 text-primary-foreground shadow-elegant">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
              <Shield className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-xl font-black leading-tight">
                {isAr ? "خصوصيتك أولويتنا" : "Your Privacy Matters"}
              </h2>
              <p className="mt-2 text-sm opacity-90">
                {isAr
                  ? "نحن نحمي بياناتك ونستخدمها فقط لتحسين تجربتك في ثواني."
                  : "We protect your data and only use it to improve your Thawani experience."}
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold backdrop-blur">
                <Calendar className="h-3.5 w-3.5" />
                {isAr ? "آخر تحديث:" : "Last updated:"} {LAST_UPDATED}
              </div>
            </div>
          </div>
        </section>

        {/* Sections */}
        <div className="space-y-3">
          {sections.map((section, idx) => (
            <section
              key={idx}
              className="rounded-2xl border border-border bg-card p-5 shadow-soft"
            >
              <h3 className="mb-3 text-base font-black text-foreground">
                {section.title}
              </h3>
              <div className="space-y-2">
                {section.content.map((line, lidx) => (
                  <p
                    key={lidx}
                    className={`text-sm leading-relaxed text-muted-foreground ${
                      line.startsWith("•") ? (isAr ? "pr-3" : "pl-3") : ""
                    }`}
                  >
                    {line}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} ثواني — Thawani. {isAr ? "جميع الحقوق محفوظة." : "All rights reserved."}
        </p>
      </main>
    </div>
  );
}

