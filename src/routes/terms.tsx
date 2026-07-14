import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, FileText, Calendar } from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "الشروط والأحكام — ثواني" },
      { name: "description", content: "الشروط والأحكام لتطبيق ثواني للتسوق والتوصيل." },
      { property: "og:title", content: "الشروط والأحكام — ثواني" },
      { property: "og:description", content: "الشروط والأحكام لتطبيق ثواني للتسوق والتوصيل." },
    ],
  }),
  component: TermsPage,
});

const LAST_UPDATED = "2026-07-14";

const arSections = [
  {
    title: "١. مقدمة",
    content: [
      "مرحباً بك في ثواني.",
      "باستخدامك لتطبيق ثواني، فإنك توافق على هذه الشروط والأحكام.",
      "يُرجى قراءة هذه الشروط بعناية قبل استخدام التطبيق أو إنشاء حساب.",
    ],
  },
  {
    title: "٢. تسجيل الحساب",
    content: [
      "يجب على المستخدمين تقديم معلومات دقيقة وكاملة عند إنشاء الحساب.",
      "المستخدم مسؤول عن الحفاظ على سرية حسابه وكلمة المرور.",
      "المستخدم مسؤول عن جميع الأنشطة التي تتم عبر حسابه.",
    ],
  },
  {
    title: "٣. استخدام التطبيق",
    content: [
      "يوافق المستخدم على:",
      "• استخدام التطبيق للأغراض القانونية فقط.",
      "• عدم إساءة استخدام التطبيق أو محاولة اختراقه.",
      "• عدم إنشاء حسابات مزيفة.",
      "• عدم تقديم معلومات خاطئة أو مضللة.",
    ],
  },
  {
    title: "٤. الطلبات والتوصيل",
    content: [
      "تخضع الطلبات لتوفر المنتجات.",
      "أوقات التوصيل هي تقديرات وقد تتغير بسبب الازدحام أو الطقس أو ظروف أخرى.",
      "المستخدم مسؤول عن تقديم عنوان توصيل دقيق وصحيح.",
    ],
  },
  {
    title: "٥. الأسعار والمدفوعات",
    content: [
      "تحدد أسعار المنتجات من قبل أصحاب المتاجر.",
      "قد يتم تطبيق رسوم توصيل أو خدمة إضافية.",
      "يتم عرض الإجمالي النهائي قبل تأكيد الطلب.",
    ],
  },
  {
    title: "٦. الإلغاء والاسترداد",
    content: [
      "يمكن إلغاء الطلبات فقط وفقاً لسياسة الإلغاء الخاصة بالتطبيق.",
      "قد لا تكون الطلبات التي دخلت مرحلة التحضير مؤهلة للإلغاء.",
      "تتم عمليات الاسترداد وفقاً لسياسة الاسترداد الخاصة بالتطبيق عندما ينطبق ذلك.",
    ],
  },
  {
    title: "٧. مسؤوليات المستخدم",
    content: [
      "على المستخدم:",
      "• احترام أصحاب المتاجر ومندوبي التوصيل.",
      "• تجنب السلوك المسيء أو غير اللائق.",
      "• تجنب انتهاك أي قوانين سارية أثناء استخدام التطبيق.",
    ],
  },
  {
    title: "٨. مسؤوليات التطبيق",
    content: [
      "يسعى التطبيق إلى تقديم خدمات موثوقة.",
      "يعمل التطبيق على تحسين منصته باستمرار.",
      "لا يضمن التطبيق توفر خدمة مستمرة دون انقطاع في جميع الأوقات.",
    ],
  },
  {
    title: "٩. تعليق الحساب",
    content: [
      "يحتفظ التطبيق بالحق في تعليق أو إنهاء أي حساب بشكل دائم في حال انتهاك هذه الشروط والأحكام أو إساءة استخدام الخدمة.",
    ],
  },
  {
    title: "١٠. تحديثات الشروط",
    content: [
      "قد يتم تحديث هذه الشروط والأحكام من وقت لآخر.",
      "سيتم إشعارك داخل التطبيق عند إجراء تغييرات جوهرية.",
      "يُعتبر الاستمرار في استخدام التطبيق بعد التحديثات موافقة منك على الشروط المعدلة.",
    ],
  },
];

const enSections = [
  {
    title: "1. Introduction",
    content: [
      "Welcome to Thawani.",
      "By using the Thawani app, you agree to these Terms & Conditions.",
      "Please read these terms carefully before using the app or creating an account.",
    ],
  },
  {
    title: "2. Account Registration",
    content: [
      "Users must provide accurate and complete information when creating an account.",
      "Users are responsible for maintaining the confidentiality of their account and password.",
      "Users are responsible for all activities performed through their account.",
    ],
  },
  {
    title: "3. Application Usage",
    content: [
      "Users agree to:",
      "• Use the application only for lawful purposes.",
      "• Not misuse or attempt to hack the application.",
      "• Not create fake accounts.",
      "• Not provide false or misleading information.",
    ],
  },
  {
    title: "4. Orders & Delivery",
    content: [
      "Orders are subject to product availability.",
      "Delivery times are estimated and may vary due to traffic, weather, or other circumstances.",
      "Users are responsible for providing an accurate delivery address.",
    ],
  },
  {
    title: "5. Pricing & Payments",
    content: [
      "Product prices are determined by store owners.",
      "Delivery or service fees may apply.",
      "The final total is displayed before confirming the order.",
    ],
  },
  {
    title: "6. Cancellations & Refunds",
    content: [
      "Orders may only be cancelled according to the application's cancellation policy.",
      "Orders that have entered the preparation stage may not be eligible for cancellation.",
      "Refunds are processed according to the application's refund policy, when applicable.",
    ],
  },
  {
    title: "7. User Responsibilities",
    content: [
      "Users must:",
      "• Respect store owners and delivery drivers.",
      "• Avoid abusive or inappropriate behavior.",
      "• Avoid violating any applicable laws while using the application.",
    ],
  },
  {
    title: "8. Application Responsibilities",
    content: [
      "The application seeks to provide reliable services.",
      "The application continuously improves its platform.",
      "The application does not guarantee uninterrupted service at all times.",
    ],
  },
  {
    title: "9. Account Suspension",
    content: [
      "The application reserves the right to suspend or permanently terminate any account that violates these Terms & Conditions or misuses the service.",
    ],
  },
  {
    title: "10. Terms Updates",
    content: [
      "These Terms & Conditions may be updated from time to time.",
      "You will be notified inside the application whenever significant changes are made.",
      "Continued use of the app after updates constitutes your acceptance of the revised terms.",
    ],
  },
];

function TermsPage() {
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
            {isAr ? "الشروط والأحكام" : "Terms & Conditions"}
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
              <FileText className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-xl font-black leading-tight">
                {isAr ? "شروط استخدام ثواني" : "Thawani Terms of Use"}
              </h2>
              <p className="mt-2 text-sm opacity-90">
                {isAr
                  ? "باستخدامك للتطبيق، فإنك توافق على القواعد والمسؤوليات التالية."
                  : "By using the app, you agree to the following rules and responsibilities."}
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
