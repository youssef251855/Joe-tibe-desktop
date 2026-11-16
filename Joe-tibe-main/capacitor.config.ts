import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.joetube.app",
  appName: "JoeTube",
  webDir: "dist",
  server: { androidScheme: "https" },
  android: { allowMixedContent: false }
};

export default config;
