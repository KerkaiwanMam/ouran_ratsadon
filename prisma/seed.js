// Seed script — creates an admin login (with full TEAM access to the Business
// Layer on top of the admin panel) and a demo Business Layer user (PRO), each
// with ~8 months of sample transactions, so the dashboard, /transactions,
// /vendors, and leak detection have real data to display out of the box.
//
// Run with:  node prisma/seed.js
// (uses @prisma/client + bcryptjs, both already in apps/web/package.json —
// run `npm install` inside apps/web first if you haven't)

// Resolve @prisma/client and bcryptjs from wherever npm actually installed
// them — this is an npm-workspaces monorepo, so they may be hoisted to the
// repo root node_modules/ OR live under apps/web/node_modules/ depending on
// your npm version/config. Try both rather than hard-coding one path.
const path = require("path");

function resolveFrom(candidates, name) {
  for (const base of candidates) {
    try {
      return require(path.join(base, "node_modules", name));
    } catch {
      // try next candidate
    }
  }
  // last resort — let Node's normal resolution try (works if hoisted to repo root
  // and this script is run via `node prisma/seed.js` from the repo root)
  return require(name);
}

const candidateBases = [
  path.join(__dirname, ".."), // repo root
  path.join(__dirname, "..", "apps", "web"), // apps/web
];

const { PrismaClient } = resolveFrom(candidateBases, "@prisma/client");
const bcrypt = resolveFrom(candidateBases, "bcryptjs");

// The project now runs on a separately-hosted PostgreSQL instance (see
// prisma/schema.prisma datasource). Plain `node seed.js` doesn't auto-load
// .env the way the Prisma CLI does, so — without depending on the `dotenv`
// package, which isn't installed here — read the repo-root .env ourselves
// and pull DATABASE_URL out of it. Don't hardcode a local SQLite path like
// this script used to; that's exactly the stale value that broke seeding
// after the move to Postgres.
if (!process.env.DATABASE_URL) {
  const fs = require("fs");
  const envPath = path.join(__dirname, "..", ".env");
  try {
    const raw = fs.readFileSync(envPath, "utf-8");
    for (const line of raw.split(/\r?\n/)) {
      const match = line.match(/^\s*DATABASE_URL\s*=\s*(.+?)\s*$/);
      if (match) {
        process.env.DATABASE_URL = match[1].replace(/^["']|["']$/g, "");
        break;
      }
    }
  } catch (err) {
    console.error(`ไม่พบไฟล์ .env ที่ ${envPath} — ตั้งค่า DATABASE_URL ก่อนรัน seed`, err);
  }
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL ยังไม่ถูกตั้งค่า — ตรวจสอบ .env ที่ root ของโปรเจกต์");
  process.exit(1);
}

console.log(`Using database: ${process.env.DATABASE_URL.replace(/:[^:@/]+@/, ":****@")}`);

const prisma = new PrismaClient();

// ─── Credentials (change these after first login!) ──────────────────────────
const ADMIN_EMAIL = "admin@ouranratsadon.local";
const ADMIN_PASSWORD = "AdminOuran2026!";
const DEMO_EMAIL = "demo@ouranratsadon.local";
const DEMO_PASSWORD = "DemoOuran2026!";

const CATEGORIES = ["บุคลากร", "สถานที่", "การตลาด", "สาธารณูปโภค", "วัตถุดิบ", "อื่นๆ"];

function monthsAgo(n, day = 5) {
  const d = new Date();
  d.setDate(1); // avoid month-rollover surprises
  d.setMonth(d.getMonth() - n);
  d.setDate(day);
  return d;
}

function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ─── Leak detection (ported from apps/web/lib/leak-detector.ts) ─────────────
// Kept in sync with the 4 rules so seeded sample data shows the same
// SPIKE/DUPLICATE/OUTLIER/CREEP flags the real upload pipeline would produce.

function stringSimilarity(a, b) {
  const norm = (s) => s.toLowerCase().replace(/\s+/g, "");
  const an = norm(a);
  const bn = norm(b);
  if (an === bn) return 1;
  if (an.length < 2 || bn.length < 2) return an === bn ? 1 : 0;

  const bigrams = (s) => {
    const set = new Set();
    for (let i = 0; i < s.length - 1; i++) set.add(s[i] + s[i + 1]);
    return set;
  };
  const sa = bigrams(an);
  const sb = bigrams(bn);
  let intersection = 0;
  for (const b of sa) if (sb.has(b)) intersection++;
  return (2 * intersection) / (sa.size + sb.size);
}

function detectMonthlySpike(transactions, categorize) {
  const flags = new Map();
  const monthCatTotal = {};
  transactions.forEach((tx) => {
    if (tx.transactionType !== "EXPENSE") return;
    const key = `${monthKey(tx.date)}::${categorize(tx.description)}`;
    monthCatTotal[key] = (monthCatTotal[key] ?? 0) + Math.abs(tx.amount);
  });

  transactions.forEach((tx, i) => {
    if (tx.transactionType !== "EXPENSE") return;
    const cat = categorize(tx.description);
    const thisMonth = monthKey(tx.date);
    const thisTotal = monthCatTotal[`${thisMonth}::${cat}`] ?? 0;

    const trailing = [];
    for (let offset = 1; offset <= 3; offset++) {
      const d = new Date(tx.date);
      d.setMonth(d.getMonth() - offset);
      const total = monthCatTotal[`${monthKey(d)}::${cat}`];
      if (total !== undefined) trailing.push(total);
    }
    if (trailing.length === 0) return;
    const avg = trailing.reduce((a, b) => a + b, 0) / trailing.length;
    if (avg === 0) return;
    const spike = (thisTotal - avg) / avg;
    if (spike > 0.3) {
      flags.set(i, {
        leakFlag: "SPIKE",
        leakSeverity: spike > 0.6 ? "CRITICAL" : "WARNING",
        leakReason: `ค่าใช้จ่ายหมวด${cat} เดือนนี้สูงกว่าค่าเฉลี่ย 3 เดือนที่ผ่านมา ${(spike * 100).toFixed(0)}%`,
      });
    }
  });

  return flags;
}

function detectDuplicatePayment(transactions) {
  const flags = new Map();
  const expenses = transactions
    .map((tx, i) => ({ tx, i }))
    .filter(({ tx }) => tx.transactionType === "EXPENSE");

  for (let a = 0; a < expenses.length; a++) {
    for (let b = a + 1; b < expenses.length; b++) {
      const ta = expenses[a].tx;
      const tb = expenses[b].tx;
      const ia = expenses[a].i;
      const ib = expenses[b].i;

      if (flags.has(ia) && flags.has(ib)) continue;

      const amountMatch = Math.abs(Math.abs(ta.amount) - Math.abs(tb.amount)) < 1;
      if (!amountMatch) continue;

      const diffDays = Math.abs(ta.date.getTime() - tb.date.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays >= 7) continue;

      const sim = stringSimilarity(ta.description, tb.description);
      if (sim < 0.85) continue;

      const reason = `อาจชำระซ้ำ: รายการ "${tb.description}" ฿${Math.abs(tb.amount).toLocaleString()} ห่างกัน ${diffDays.toFixed(0)} วัน (ความคล้ายกัน ${(sim * 100).toFixed(0)}%)`;
      const result = { leakFlag: "DUPLICATE", leakSeverity: "WARNING", leakReason: reason };
      if (!flags.has(ia)) flags.set(ia, result);
      if (!flags.has(ib)) flags.set(ib, result);
    }
  }

  return flags;
}

function detectOutlier(transactions, categorize) {
  const flags = new Map();
  const categoryAmounts = {};

  transactions.forEach((tx) => {
    if (tx.transactionType !== "EXPENSE") return;
    const cat = categorize(tx.description);
    if (!categoryAmounts[cat]) categoryAmounts[cat] = [];
    categoryAmounts[cat].push(Math.abs(tx.amount));
  });

  transactions.forEach((tx, i) => {
    if (tx.transactionType !== "EXPENSE") return;
    const cat = categorize(tx.description);
    const amounts = categoryAmounts[cat] ?? [];
    if (amounts.length < 3) return;
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance = amounts.reduce((a, b) => a + (b - mean) ** 2, 0) / amounts.length;
    const sd = Math.sqrt(variance);
    const z = (Math.abs(tx.amount) - mean) / (sd || 1);
    if (z > 2.5) {
      flags.set(i, {
        leakFlag: "OUTLIER",
        leakSeverity: z > 3.5 ? "CRITICAL" : "WARNING",
        leakReason: `จำนวนเงินสูงกว่าค่าเฉลี่ยหมวด${cat} ${z.toFixed(1)} SD`,
      });
    }
  });

  return flags;
}

function detectRecurringCostCreep(transactions) {
  const flags = new Map();
  const descMonthAmount = {};
  transactions.forEach((tx) => {
    if (tx.transactionType !== "EXPENSE") return;
    const key = tx.description.trim().toLowerCase();
    const mo = monthKey(tx.date);
    if (!descMonthAmount[key]) descMonthAmount[key] = {};
    descMonthAmount[key][mo] = (descMonthAmount[key][mo] ?? 0) + Math.abs(tx.amount);
  });

  const creepDescriptions = new Set();
  for (const [desc, byMonth] of Object.entries(descMonthAmount)) {
    const months = Object.keys(byMonth).sort();
    if (months.length < 4) continue;

    let streak = 0;
    for (let i = 1; i < months.length; i++) {
      const prev = byMonth[months[i - 1]];
      const curr = byMonth[months[i]];
      if (prev > 0 && (curr - prev) / prev > 0.05) {
        streak++;
        if (streak >= 3) {
          creepDescriptions.add(desc);
          break;
        }
      } else {
        streak = 0;
      }
    }
  }

  transactions.forEach((tx, i) => {
    if (tx.transactionType !== "EXPENSE") return;
    const key = tx.description.trim().toLowerCase();
    if (creepDescriptions.has(key)) {
      flags.set(i, {
        leakFlag: "CREEP",
        leakSeverity: "WARNING",
        leakReason: `รายการ "${tx.description}" มีค่าใช้จ่ายเพิ่มขึ้น >5% ต่อเดือนติดต่อกัน 3 เดือนขึ้นไป`,
      });
    }
  });

  return flags;
}

function detectLeaks(transactions, categorize) {
  const spikes = detectMonthlySpike(transactions, categorize);
  const duplicates = detectDuplicatePayment(transactions);
  const outliers = detectOutlier(transactions, categorize);
  const creep = detectRecurringCostCreep(transactions);

  return transactions.map((_, i) => {
    // Priority: DUPLICATE > SPIKE > OUTLIER > CREEP
    return (
      duplicates.get(i) ??
      spikes.get(i) ??
      outliers.get(i) ??
      creep.get(i) ?? { leakFlag: "NONE", leakSeverity: null, leakReason: null }
    );
  });
}

// ─── User + subscription helpers ─────────────────────────────────────────────

async function upsertUser(email, password, name, role) {
  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return prisma.user.update({
      where: { email },
      data: { passwordHash, name, role },
    });
  }
  return prisma.user.create({
    data: { email, name, passwordHash, role },
  });
}

async function ensureSubscription(userId, plan) {
  await prisma.subscription.upsert({
    where: { userId },
    update: { plan, status: "ACTIVE", isManuallyGranted: true, cancelAtPeriodEnd: false },
    create: { userId, plan, status: "ACTIVE", isManuallyGranted: true },
  });
}

// ─── Sample transaction data ─────────────────────────────────────────────────
// 8 months of history: steady baseline + a deliberate spike in "การตลาด"
// (marketing) in the latest month, a brand-new "อื่นๆ" vendor showing up for
// the first time, and a near-duplicate rent payment pair — designed to
// trigger the SPIKE and DUPLICATE leak-detection rules out of the box.

async function seedSampleTransactions(user, filename) {
  // Clear any previously-seeded data for this user so re-running is safe/idempotent
  await prisma.transaction.deleteMany({ where: { userId: user.id } });
  await prisma.file.deleteMany({ where: { userId: user.id } });
  await prisma.monthlyFinancialSummary.deleteMany({ where: { userId: user.id } });
  await prisma.diagnosticInsight.deleteMany({ where: { userId: user.id } });
  await prisma.forecastSnapshot.deleteMany({ where: { userId: user.id } });
  await prisma.recommendation.deleteMany({ where: { userId: user.id } });

  const file = await prisma.file.create({
    data: {
      userId: user.id,
      filename,
      fileSize: 24576,
      fileType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      sourceFormat: "EXCEL_TEMPLATE",
      status: "DONE",
      storageKey: `seed/${filename}`,
      processedAt: new Date(),
    },
  });

  const MONTHS_BACK = 8;
  const baseline = {
    บุคลากร: 45000,
    สถานที่: 18000,
    การตลาด: 8000,
    สาธารณูปโภค: 6000,
    วัตถุดิบ: 22000,
    อื่นๆ: 0,
  };
  const monthlyIncome = 110000;

  const txData = [];

  for (let m = MONTHS_BACK - 1; m >= 0; m--) {
    const isLatest = m === 0;
    const date = monthsAgo(m);

    txData.push({
      date: monthsAgo(m, 1),
      description: "รายได้จากการขายสินค้า/บริการ",
      category: "รายได้",
      amount: monthlyIncome + (Math.random() * 8000 - 4000),
      transactionType: "INCOME",
    });

    for (const category of CATEGORIES) {
      let amount = baseline[category];
      if (amount === 0 && !isLatest) continue; // "อื่นๆ" stays empty until latest month

      // small random month-to-month variance
      amount = amount * (0.92 + Math.random() * 0.16);

      // inject anomalies in the latest month
      if (isLatest && category === "การตลาด") amount = amount * 2.4; // spike
      if (isLatest && category === "อื่นๆ") amount = 15000; // new vendor surge

      txData.push({
        date,
        description: `ค่าใช้จ่าย${category} ประจำเดือน`,
        category,
        amount: Math.round(amount),
        transactionType: "EXPENSE",
      });
    }
  }

  // Near-duplicate payment pair in the latest month (DUPLICATE leak demo)
  const dupDate = monthsAgo(0, 12);
  txData.push(
    { date: dupDate, description: "ค่าเช่าสำนักงานสาขา 2", category: "สถานที่", amount: 14500, transactionType: "EXPENSE" },
    { date: monthsAgo(0, 14), description: "ค่าเช่าสำนักงานสาขา2", category: "สถานที่", amount: 14500, transactionType: "EXPENSE" }
  );

  // categorize() for the leak detector — every synthetic description maps 1:1
  // to a known category, so a simple lookup reproduces the real pipeline.
  const categoryByDescription = new Map(txData.map((t) => [t.description, t.category]));
  const categorize = (desc) => categoryByDescription.get(desc) ?? "อื่นๆ";

  const leaks = detectLeaks(
    txData.map((t) => ({ date: t.date, description: t.description, amount: t.amount, transactionType: t.transactionType })),
    categorize
  );

  let totalIncome = 0;
  let totalExpense = 0;

  for (let i = 0; i < txData.length; i++) {
    const tx = txData[i];
    const leak = leaks[i];
    if (tx.transactionType === "INCOME") totalIncome += tx.amount;
    else totalExpense += Math.abs(tx.amount);

    await prisma.transaction.create({
      data: {
        fileId: file.id,
        userId: user.id,
        date: tx.date,
        description: tx.description,
        category: tx.category,
        amount: tx.amount,
        transactionType: tx.transactionType,
        autoCategorized: true,
        leakFlag: leak.leakFlag,
        leakSeverity: leak.leakSeverity,
        leakReason: leak.leakReason,
      },
    });
  }

  const sortedDates = txData.map((t) => t.date).sort((a, b) => a - b);
  await prisma.file.update({
    where: { id: file.id },
    data: {
      transactionCount: txData.length,
      totalIncome,
      totalExpense,
      periodStart: sortedDates[0],
      periodEnd: sortedDates[sortedDates.length - 1],
    },
  });

  const flagged = leaks.filter((l) => l.leakFlag !== "NONE").length;
  return { count: txData.length, flagged };
}

async function main() {
  // ── Admin user — TEAM plan, so it has full access to admin panel AND every
  //    Pro/Team Business Layer feature (vendors, forecast, etc.) ────────────
  const admin = await upsertUser(ADMIN_EMAIL, ADMIN_PASSWORD, "ผู้ดูแลระบบ", "ADMIN");
  await ensureSubscription(admin.id, "TEAM");
  const adminStats = await seedSampleTransactions(admin, "sample-business-data-admin.xlsx");
  console.log(`✓ Admin user ready: ${admin.email} (TEAM plan, ${adminStats.count} transactions, ${adminStats.flagged} flagged)`);

  // ── Demo Business Layer user (Pro, with sample data) ──────────────────────
  const demo = await upsertUser(DEMO_EMAIL, DEMO_PASSWORD, "ร้านตัวอย่าง จำกัด", "MEMBER");
  await ensureSubscription(demo.id, "PRO");
  const demoStats = await seedSampleTransactions(demo, "sample-business-data.xlsx");
  console.log(`✓ Demo user ready: ${demo.email} (PRO plan, ${demoStats.count} transactions, ${demoStats.flagged} flagged)`);

  console.log("  Tip: log in and open /dashboard → /transactions → /vendors → /analytics.");
  console.log("  Tier 1/2/4 analytics recompute lazily on first read; Tier 3 forecast needs");
  console.log("  one click on \"คำนวณการพยากรณ์\" on the /analytics page (POST /api/business/analytics/forecast).");

  console.log("\n──────────────────────────────────────────────");
  console.log(" Login credentials (change after first login!) ");
  console.log("──────────────────────────────────────────────");
  console.log(` Admin : ${ADMIN_EMAIL}  /  ${ADMIN_PASSWORD}  (ADMIN role + TEAM plan)`);
  console.log(` Demo  : ${DEMO_EMAIL}   /  ${DEMO_PASSWORD}  (PRO plan)`);
  console.log("──────────────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
