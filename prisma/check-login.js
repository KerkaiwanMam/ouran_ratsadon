// Diagnostic — checks exactly why a seeded login is failing.
// Run with:  node prisma/check-login.js
const path = require("path");

function resolveFrom(candidates, name) {
  for (const base of candidates) {
    try {
      return require(path.join(base, "node_modules", name));
    } catch {}
  }
  return require(name);
}

const candidateBases = [path.join(__dirname, ".."), path.join(__dirname, "..", "apps", "web")];
const { PrismaClient } = resolveFrom(candidateBases, "@prisma/client");
const bcrypt = resolveFrom(candidateBases, "bcryptjs");

process.env.DATABASE_URL = "file:" + path.join(__dirname, "prisma", "dev.db");
console.log(`Using database: ${process.env.DATABASE_URL}\n`);

const prisma = new PrismaClient();

const checks = [
  { email: "admin@ouranratsadon.local", password: "AdminOuran2026!" },
  { email: "demo@ouranratsadon.local", password: "DemoOuran2026!" },
];

async function main() {
  for (const { email, password } of checks) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log(`✗ ${email} — NOT FOUND in database`);
      continue;
    }
    if (!user.passwordHash) {
      console.log(`✗ ${email} — found, but passwordHash is NULL`);
      continue;
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    console.log(
      `${valid ? "✓" : "✗"} ${email} — found (role=${user.role}, banned=${user.banned}); password "${password}" ${
        valid ? "MATCHES" : "DOES NOT MATCH"
      } stored hash`
    );
  }

  const total = await prisma.user.count();
  console.log(`\nTotal users in database: ${total}`);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
