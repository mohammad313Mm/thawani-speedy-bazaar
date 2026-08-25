import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.thawani",
  appName: "ثواني",
  // This app is server-rendered: the build emits no static index.html, and the
  // 158 createServerFn calls must reach the same origin. So the native shell
  // loads the deployed site instead of bundled assets. webDir is still required
  // by `cap sync`, hence the (asset-only) build output.
  webDir: ".output/public",
  server: {
    url: "https://thawani-speedy-bazaar.lovable.app",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
