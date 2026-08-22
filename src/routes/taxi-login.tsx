import { createFileRoute, Navigate } from "@tanstack/react-router";

// Taxi drivers no longer have separate credentials: authorization is granted
// by the admin to a phone number and unlocked on normal customer sign-in.
export const Route = createFileRoute("/taxi-login")({
  head: () => ({
    meta: [
      { title: "دخول سائق التكسي — ثواني" },
      {
        name: "description",
        content: "دخول سائق التكسي أصبح عبر تسجيل الدخول المعتاد برقم الهاتف المخوّل من الإدارة.",
      },
      { property: "og:title", content: "دخول سائق التكسي — ثواني" },
      { property: "og:description", content: "سجّل الدخول برقم هاتفك المخوّل للوصول إلى طلبات التكسي." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <Navigate to="/auth" replace />,
});
