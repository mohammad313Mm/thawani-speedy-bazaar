import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { BottomNav } from "../components/BottomNav";
import { ThemeProvider } from "../lib/theme";
import { CartProvider } from "../lib/cart";
import { OrdersProvider } from "../lib/orders";
import { AuthProvider } from "../lib/auth";
import { Toaster } from "../components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center animate-fade-in">
        <h1 className="text-7xl font-black text-primary">٤٠٤</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">الصفحة غير موجودة</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          الصفحة التي تبحث عنها غير موجودة أو تم نقلها.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-elegant transition-transform hover:scale-[1.02]"
          >
            العودة للرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-bold text-foreground">حدث خطأ ما</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          نعتذر عن الإزعاج. يمكنك المحاولة مرة أخرى أو العودة للرئيسية.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            حاول مرة أخرى
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-input bg-background px-5 py-2.5 text-sm font-semibold text-foreground"
          >
            الرئيسية
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#D62828" },
      { title: "ثواني — تسوق وتوصيل سريع في العراق" },
      {
        name: "description",
        content:
          "ثواني — منصة التسوق والتوصيل الأولى في العراق. مطاعم، بقالة، كوزمتك، وحلويات ومشروبات. كل ما تحتاجه مع ثواني.",
      },
      { property: "og:title", content: "ثواني — تسوق وتوصيل سريع في العراق" },
      {
        property: "og:description",
        content: "ثواني — منصة التسوق والتوصيل الأولى في العراق. مطاعم، بقالة، كوزمتك، وحلويات ومشروبات. كل ما تحتاجه مع ثواني.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "ثواني — تسوق وتوصيل سريع في العراق" },
      { name: "twitter:description", content: "ثواني — منصة التسوق والتوصيل الأولى في العراق. مطاعم، بقالة، كوزمتك، وحلويات ومشروبات. كل ما تحتاجه مع ثواني." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/c5c45070-6d0d-43d1-8e63-020f669b07c5/id-preview-92625705--dc837d29-2bf5-4cb7-b71d-f3b3f79c280d.lovable.app-1783851116131.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/c5c45070-6d0d-43d1-8e63-020f669b07c5/id-preview-92625705--dc837d29-2bf5-4cb7-b71d-f3b3f79c280d.lovable.app-1783851116131.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=Tajawal:wght@400;500;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AppFrame() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hideNav =
    pathname === "/welcome" ||
    pathname.startsWith("/checkout");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className={hideNav ? "" : "pb-24"}>
        <Outlet />
      </div>
      {!hideNav && <BottomNav />}
      <Toaster position="top-center" richColors />
    </div>

  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <CartProvider>
            <OrdersProvider>
              <AppFrame />
            </OrdersProvider>
          </CartProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
