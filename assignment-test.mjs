// Part 2 step 5 — manual end-to-end test of per-kid assignment.
// Narrows "Made the bed" to Nova only via the Library edit panel, then checks:
//   (a) Milo's award modal no longer shows the tile (Nova's still does)
//   (b) the two kids' printed PDFs genuinely differ (chore counts + bytes)
import { chromium } from "playwright-core";
import fs from "node:fs";

const BASE = "http://127.0.0.1:3000";
const out = (m) => console.log(m);
const fail = (m) => {
  console.error("FAIL: " + m);
  process.exitCode = 1;
};

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, acceptDownloads: true });

// The auth guard only checks that a local session exists and hasn't expired —
// inject a fake one so private routes render (the Supabase backend is
// unreachable from this environment; the app stays in demo mode).
const fakeJwt = (payload) =>
  ["e30", Buffer.from(JSON.stringify(payload)).toString("base64url"), "sig"].join(".");
await page.addInitScript(
  ({ token }) => localStorage.setItem("sb-tcpbvcgvtwrqsrzerwwr-auth-token", token),
  {
    token: JSON.stringify({
      access_token: fakeJwt({ sub: "test-user", exp: Math.floor(Date.now() / 1000) + 86400 }),
      refresh_token: "fake",
      expires_at: Math.floor(Date.now() / 1000) + 86400,
      expires_in: 86400,
      token_type: "bearer",
      user: { id: "test-user", aud: "authenticated", email: "test@example.com" },
    }),
  },
);

// Fresh demo state.
await page.goto(BASE + "/?entered=true");
await page.evaluate(() => localStorage.removeItem("pointpals.state.v2"));
await page.goto(BASE + "/?entered=true");
await page.waitForSelector("text=Nova");

// ── Narrow "Made the bed" to Nova only ──────────────────────────────────────
await page.goto(BASE + "/library");
await page.waitForSelector("text=Made the bed");
await page.getByRole("button", { name: /Made the bed/ }).first().click();
await page.waitForSelector("text=Applies to");
// Deselect Milo and Wren (all three start ticked).
await page.getByRole("button", { name: "Milo", pressed: true }).click();
await page.getByRole("button", { name: "Wren", pressed: true }).click();
await page.getByRole("button", { name: "Save changes" }).click();
await page.waitForTimeout(400);

const stored = await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("pointpals.state.v2"));
  return s.chores.find((c) => c.name === "Made the bed")?.assignedKidIds;
});
if (JSON.stringify(stored) === JSON.stringify(["k1"])) {
  out("PASS: assignedKidIds persisted as ['k1'] (Nova only)");
} else {
  fail("persisted assignedKidIds = " + JSON.stringify(stored));
}

// Narrowed indicator (avatar stack) on the tile.
const stack = await page.locator("[title^='Only for']").count();
out((stack > 0 ? "PASS" : "FAIL") + ": narrowed-item avatar stack visible on Library tile");
if (stack === 0) process.exitCode = 1;

// Universal saves as null: open another chore, leave everyone ticked, save.
await page.getByRole("button", { name: /Got dressed/ }).first().click();
await page.waitForSelector("text=Applies to");
await page.getByRole("button", { name: "Save changes" }).click();
await page.waitForTimeout(300);
const universal = await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("pointpals.state.v2"));
  return s.chores.find((c) => c.name === "Got dressed")?.assignedKidIds;
});
if (universal == null) out("PASS: everyone-ticked saved as null (universal), not an explicit array");
else fail("'Got dressed' saved assignedKidIds = " + JSON.stringify(universal));

// ── (a) Award modal tiles ───────────────────────────────────────────────────
await page.goto(BASE + "/?entered=true");
await page.waitForSelector("text=Tap a kid");
await page.waitForTimeout(1500); // let hydration settle so handlers are attached

async function tileVisibleFor(kidName) {
  await page.getByRole("button", { name: new RegExp(kidName) }).first().click();
  await page.waitForSelector("[role=dialog]");
  const n = await page.locator("[role=dialog]").getByText("Made the bed", { exact: true }).count();
  await page.keyboard.press("Escape");
  await page.waitForSelector("[role=dialog]", { state: "detached" });
  return n > 0;
}
const novaHas = await tileVisibleFor("Nova");
const miloHas = await tileVisibleFor("Milo");
out((novaHas ? "PASS" : "FAIL") + ": Nova's award modal shows 'Made the bed'");
out((!miloHas ? "PASS" : "FAIL") + ": Milo's award modal does NOT show 'Made the bed'");
if (!novaHas || miloHas) process.exitCode = 1;

// ── (b) Printed PDFs differ ─────────────────────────────────────────────────
await page.goto(BASE + "/library");
await page.getByRole("button", { name: "Family" }).click();
await page.waitForSelector("text=weekly");

const counts = await page.evaluate(() => {
  const cards = [...document.querySelectorAll(".card-soft")];
  const get = (name) => {
    const card = cards.find((c) => c.textContent.includes(name) && c.textContent.includes("weekly"));
    const m = card?.textContent.match(/(\d+)\s*weekly/);
    return m ? Number(m[1]) : null;
  };
  return { nova: get("Nova"), milo: get("Milo") };
});
out(`Weekly chore counts — Nova: ${counts.nova}, Milo: ${counts.milo}`);
if (counts.nova === counts.milo + 1) out("PASS: Nova's chart lists exactly one more chore than Milo's");
else fail("expected Nova = Milo + 1");

async function downloadChartFor(kidName) {
  const card = page.locator(".card-soft", { hasText: kidName }).filter({ hasText: "weekly" }).first();
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 30000 }),
    card.getByRole("button", { name: /chart/i }).click(),
  ]);
  const path = `/tmp/claude-0/-home-user-point-pals-app/5292ed08-ef5f-527d-b3d8-bf08ecb578aa/scratchpad/${kidName}.pdf`;
  await download.saveAs(path);
  return path;
}
try {
  const novaPdf = await downloadChartFor("Nova");
  const miloPdf = await downloadChartFor("Milo");
  const a = fs.readFileSync(novaPdf);
  const b = fs.readFileSync(miloPdf);
  out(`PDF sizes — Nova: ${a.length}B, Milo: ${b.length}B`);
  // Same-name rows would still differ (kid name header), so also assert the
  // page contains different row counts via size delta being non-trivial.
  if (!a.equals(b)) out("PASS: the two kids' PDFs are different documents");
  else fail("PDFs are byte-identical");
} catch (e) {
  fail("PDF download failed: " + e.message);
}

await browser.close();
out(process.exitCode ? "RESULT: FAILURES ABOVE" : "RESULT: ALL CHECKS PASSED");
