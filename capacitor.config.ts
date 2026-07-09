import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'nz.co.pointpals.app',
  appName: 'PointPals',
  webDir: 'capacitor-web',

  // ── Dev ───────────────────────────────────────────────────────────────────
  // During local development the WebView loads from the Vite dev server instead
  // of reading bundled files.  Run `npm run dev` first, then `npx cap run`.
  // ────────────────────────────────────────────────────────────────────────────
  server: {
    // vite dev server URL (change IP if testing on another device on the LAN)
    url: 'http://localhost:8081',
    cleartext: true,
  },

  // ── Deep links (Supabase PKCE auth callback) ───────────────────────────────
  // After sign-in the Supabase redirect URI bounces back to:
  //   pointpals://callback#access_token=...
  // Capacitor intercepts this via android:launchMode / custom scheme on iOS.
  // ────────────────────────────────────────────────────────────────────────────
  android: {
    // Required so the auth redirect returns to the same activity instance.
    launchMode: 'singleTask',
  },
  ios: {
    // Tells iOS to treat nz.co.pointpals.app:// callbacks as belonging to our app.
    scheme: 'pointpals',
  },

  // ── Plugins ───────────────────────────────────────────────────────────────
  plugins: {
    CapacitorCookies: {
      enabled: true,
    },
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
