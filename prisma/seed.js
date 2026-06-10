// Seed script — creates an admin login + a demo Business Layer user with
// ~8 months of sample transactions, so the dashboard and the new 4-tier
// analytics module (/analytics) have real data to display out of the box.
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

async function main() {
  // ── Admin user ────────────────────────────────────────────────────────────
  const admin = await upsertUser(ADMIN_EMAIL, ADMIN_PASSWORD, "ผู้ดูแลระบบ", "ADMIN");
  console.log(`✓ Admin user ready: ${admin.email}`);

  // ── Demo Business Layer user (Pro, with sample data) ──────────────────────
  const demo = await upsertUser(DEMO_EMAIL, DEMO_PASSWORD, "ร้านตัวอย่าง จำกัด", "MEMBER");

  await prisma.subscription.upsert({
    where: { userId: demo.id },
    update: { plan: "PRO", status: "ACTIVE", isManuallyGranted: true },
    create: { userId: demo.id, plan: "PRO", status: "ACTIVE", isManuallyGranted: true },
  });

  // Clear any previously-seeded data for this user so re-running is safe/idempotent
  await prisma.transaction.deleteMany({ where: { userId: demo.id } });
  await prisma.file.deleteMany({ where: { userId: demo.id } });
  await prisma.monthlyFinancialSummary.deleteMany({ where: { userId: demo.id } });
  await prisma.diagnosticInsight.deleteMany({ where: { userId: demo.id } });
  await prisma.forecastSnapshot.deleteMany({ where: { userId: demo.id } });
  await prisma.recommendation.deleteMany({ where: { userId: demo.id } });

  const file = await prisma.file.create({
    data: {
      userId: demo.id,
      filename: "sample-business-data.xlsx",
      fileSize: 24576,
      fileType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      sourceFormat: "EXCEL_TEMPLATE",
      status: "DONE",
      storageKey: "seed/sample-business-data.xlsx",
      processedAt: new Date(),
    },
  });

  // 8 months of history: steady baseline + a deliberate spike in "การตลาด"
  // (marketing) in the latest month, and a brand-new "อื่นๆ" vendor showing
  // up for the first time — these are designed to trigger Tier 2 diagnostics.
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
  let occurrence = 0;

  for (let m = MONTHS_BACK - 1; m >= 0; m--) {
    const isLatest = m === 0;
    const date = monthsAgo(m);

    // Income
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

  // Add one near-duplicate payment pair in the latest month (Outlier/leak demo)
  const dupDate = monthsAgo(0, 12);
  txData.push(
    { date: dupDate, description: "ค่าเช่าสำนักงานสาขา 2", category: "สถานที่", amount: 14500, transactionType: "EXPENSE" },
    { date: monthsAgo(0, 14), description: "ค่าเช่าสำนักงานสาขา2", category: "สถานที่", amount: 14500, transactionType: "EXPENSE" }
  );

  let totalIncome = 0;
  let totalExpense = 0;

  for (const tx of txData) {
    occurrence += 1;
    if (tx.transactionType === "INCOME") totalIncome += tx.amount;
    else totalExpense += Math.abs(tx.amount);

    await prisma.transaction.create({
      data: {
        fileId: file.id,
        userId: demo.id,
        date: tx.date,
        description: tx.description,
        category: tx.category,
        amount: tx.amount,
        transactionType: tx.transactionType,
        autoCategorized: true,
        leakFlag: "NONE",
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

  console.log(`✓ Demo user ready: ${demo.email} (${txData.length} transactions across ${MONTHS_BACK} months)`);
  console.log("  Tip: open /upload → /analytics after logging in as the demo user.");
  console.log("  Tier 1/2/4 analytics recompute lazily on first read; Tier 3 forecast needs");
  console.log("  one click on \"คำนวณการพยากรณ์\" on the /analytics page (POST /api/business/analytics/forecast).");

  console.log("\n──────────────────────────────────────────────");
  console.log(" Login credentials (change after first login!) ");
  console.log("──────────────────────────────────────────────");
  console.log(` Admin : ${ADMIN_EMAIL}  /  ${ADMIN_PASSWORD}`);
  console.log(` Demo  : ${DEMO_EMAIL}   /  ${DEMO_PASSWORD}`);
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
