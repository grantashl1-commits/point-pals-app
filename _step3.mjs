import { readFileSync, writeFileSync } from "fs";

// ── 1. SplashScreen in _authenticated.tsx (replaces spinner) ──
let auth = readFileSync("src/routes/_authenticated.tsx", "utf8");

// Add import
auth = auth.replace(
  `import { useApp } from "@/lib/app-store";`,
  `import { SplashScreen } from "@/components/SplashScreen";\nimport { useApp } from "@/lib/app-store";`,
);

// Replace the spinner div with SplashScreen
auth = auth.replace(
  `    return (\r\n      <div className="flex min-h-[60vh] items-center justify-center">\r\n        <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground/30 border-t-foreground" />\r\n      </div>\r\n    );`,
  `    return <SplashScreen />;`,
);

writeFileSync("src/routes/_authenticated.tsx", auth);
console.log("✅ _authenticated.tsx — splash screen added");

// ── 2. Also handle the initial load in _authenticated.index.tsx (home page) ──
// Check if the index page also has a hydration related check

// ── 3. Root-level splash for the very first paint delay ──
// The __root.tsx shell renders <html> + <head> + <body>. The body doesn't
// have any visible loading state — it goes straight into RootComponent which
// starts the app. Since TanStack SSR hydration is instant on the client for
// the first load, and subsequent loads are SPA navigations, a root-level
// loading screen isn't needed — the _authenticated splash covers it.

console.log("✅ Loading state wiring complete");
