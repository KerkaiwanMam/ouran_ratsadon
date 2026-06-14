# 🗂️ Sprint Board & Architecture Roadmap — Budget Intelligence (ouran_ratsadon)

> **แปลงจาก Raw Notes 3 ฉบับ** → `ai_proof_strategy_v2` · `backend_gateway_storage_architecture` · `business_model_features_roadmap_v2` + `CLAUDE.md`
> **กรอบคิด:** AI-on-Top 3 ชั้น (Layer 1 Shared Truth → Layer 2 Verification → Layer 3 Narrative/Chat)
> **อัปเดต:** 14 มิ.ย. 2026 · **สถานะ:** Done = พร้อมใช้ · Doing = Phase 1 Activation (กำลังทำ) · ToDo = Phase 2–3 / Pro-Max backlog

**วิธีอ่านคอลัมน์:** `I·E` = Impact·Effort (1–5) · Priority = ลำดับลงมือ · 🟢 Done · 🟡 Doing · 🔵 ToDo

---

## 🔄 Reality Check — อัปเดตจากโค้ดจริง (audit 15 มิ.ย. 2026)

> ตรวจ repo จริง (`apps/web` + `apps/parser` + `prisma/schema.prisma`) แล้ว — **ระบบไปไกลกว่า raw notes มาก** หลายอย่างที่บอร์ดเดิมมาร์ก ToDo/Doing **สร้างเสร็จแล้ว** ปรับสถานะตามของจริงดังนี้:

**คอขวดเดิม 5 ข้อ — เคลียร์ไปเกือบหมด:**

| # | คอขวดเดิม | สถานะจริงในโค้ด | สรุป |
|---|-----------|------------------|------|
| 1 | ไม่มี Object Store | ✅ มี `api/files/presign` + `[id]/confirm` + `lib/file-storage.ts` → **Firebase Storage** (prod) + local fallback (dev) | **เคลียร์** (ใช้ Firebase แทน R2 — ต้องอัปเดต `backend_gateway` doc ที่ยังเขียน R2) |
| 2 | Infra งานเบื้องหลัง | ✅ Upstash Redis + Ratelimit, Resend (email), Stripe webhook, PDF export route ครบ | **เคลียร์เป็นส่วนใหญ่** (ใช้ Upstash ไม่ใช่ BullMQ — ต้องยืนยัน scheduler ของ scheduled report) |
| 3 | PDPA Gate ก่อน Chat | ✅ `api/business/chat` + `lib/assistant/*` — rule-based, **ส่งเฉพาะ governed aggregates ไม่แตะ raw tx**, มี citation drill-down | **เคลียร์เชิงสถาปัตยกรรม** (ยังไม่ต่อ LLM จริง = by design) |
| 4 | นิยาม metric ชุดเดียว | 🟡 มี `lib/analytics/{summary,diagnose,predict,recommend}.ts` + `forecaster.ts` รวมศูนย์แล้ว | **เกือบเสร็จ** — เหลือ audit ว่า dashboard/forecast/chat อ่าน source เดียวกันจริง |
| 5 | Narrative + drill-down | ✅ `transactions`, `vendors`, `action-items` pages + chat citations → href drill-down | **เคลียร์** |

**สร้างเสร็จแล้วแต่บอร์ดเดิมยังเป็น ToDo:** Stripe (checkout + webhook verify signature) · Vendor profile API · Thai Q&A/assistant · Workspace/RBAC + comments · API keys (developer portal) · Fiscal overview + `FiscalYearSummary` · Google OAuth · Subscription/billing.

### 🚩 ช่องว่างจริง 3 ข้อ (ต้องทำต่อ — grounded กับโค้ด)

| # | ปัญหา | หลักฐานในโค้ด | ความรุนแรง |
|---|--------|----------------|-------------|
| A | **LINE ยังใช้ LINE Notify ที่ปิดบริการแล้ว (มี.ค. 2025)** — alert จะเงียบ/พังจริง | `lib/line-notify.ts` (อ้าง `notify-bot.line.me`), `lib/alert-triggers.ts`, `settings/notifications`, `api/.../test-line` | 🔴 สูง (feature เรือธง Pro ใช้ไม่ได้จริง) |
| B | **ไม่มี automated test + CI เลย** — ไม่เจอ `*.test/*.spec`, ไม่มี `.github/workflows`, `package.json` มีแค่ `lint` | ทั้ง repo | 🔴 สูง (portfolio ที่ recruiter เปิดดู + กัน parser พังเงียบ) |
| C | **ยังมีหน้า mock data 1 จุด** | `app/(dashboard)/report/[id]/page.tsx` import `mock-data` | 🟠 กลาง |

---

## ✅ ทำอะไรต่อ — Next Sprint (เรียงตามผลตอบแทน)

1. **[P0] ย้าย LINE Notify → LINE Messaging API (OA)** — แก้ `lib/line-notify.ts` เป็น push ผ่าน Messaging API, เพิ่ม channel access token + account-link flow, อัปเดต `alert-triggers` + หน้า settings + `test-line`. *ของเดิมจะหยุดทำงานจริงเพราะ LINE ปิด Notify แล้ว — นี่คือ bug ไม่ใช่ feature.*
2. **[P0] วาง baseline test + CI** — Vitest unit บน `analyzers`/`parsers`/`forecaster` + `lib/analytics`, **bank-statement snapshot test** (กัน parser พังเงียบ) + Playwright smoke 1 เส้น (upload → dashboard → drill-down) → GitHub Actions gate: `tsc --noEmit` + `eslint` + `test` + `prisma validate` ก่อน merge.
3. **[P1] ปิด One View One Truth** — audit ว่า dashboard/forecast/chat/analytics อ่านจาก `lib/analytics/summary.ts` + `forecaster.ts` ชุดเดียวกันจริง; ถ้าซ้ำให้ดึงเป็น `lib/metrics.ts` global definition + เพิ่ม sanity-check หลัง parse (ยอดรวม/จำนวนแถว → flag "โปรดตรวจสอบ" แทนเงียบ).
4. **[P1] ตัด mock data จุดสุดท้าย** — wire `report/[id]/page.tsx` เข้า API จริง แล้วลบ `lib/mock-data.ts`.
5. **[P2] Monitoring + เอกสารตรงจริง** — เพิ่ม Sentry + structured logging (request-id ข้าม Next.js ↔ FastAPI); อัปเดต `backend_gateway` doc: storage = **Firebase** ไม่ใช่ R2, queue = **Upstash** ไม่ใช่ BullMQ; ยืนยัน scheduler ของ scheduled report.
6. **[P2] เปิด LLM จริงใน Q&A (ถ้าจะไป Phase 3 เต็ม)** — ตอนนี้ chat เป็น rule-based; ต่อ Claude API ทับ intent→query เดิม โดยคง guardrail (aggregated only, mask counterparty, rate limit, cost < 10% ARPU).

> **กฎเหล็กก่อนเริ่ม:** อย่าเพิ่ม feature ใหม่จนกว่า P0 (LINE + CI/test) จะเสร็จ — ระบบ feature-complete แล้ว ความเสี่ยงตอนนี้คือ "ของที่มีพังเงียบ" ไม่ใช่ "ของที่ยังไม่มี"

---

## 🎯 คอขวดเดิม (เก็บไว้อ้างอิง — ส่วนใหญ่เคลียร์แล้ว ดูตารางบน)

| # | คอขวด | บล็อกอะไร | ฝ่ายที่ต้องเริ่ม | สถานะ (อัปเดต) |
|---|--------|-----------|------------------|--------|
| 1 | Object Store | Scheduled report, ไฟล์ใหญ่, audit trail | DevOps + Backend | ✅ Done (Firebase) |
| 2 | Infra งานเบื้องหลัง | ทุก feature Phase 2 | DevOps | ✅ Done (Upstash/Resend/Stripe) |
| 3 | PDPA Gate ก่อน Chat | เปิด Chat/NLQ | Backend + QA/Governance | ✅ Done (rule-based, aggregated-only) |
| 4 | นิยาม metric ชุดเดียว | narrative/Q&A หลอน | Database + Backend | 🟡 Doing (เหลือ audit) |
| 5 | Narrative + drill-down | Dashboard เก่า | Frontend | ✅ Done |

> ⚠️ **หมายเหตุ:** ตารางรายฝ่าย 5 ตารางด้านล่างเขียนจาก *raw notes เดิม* ก่อน audit โค้ด — สถานะ 🔵 ToDo หลายแถว (R2, Stripe, vendor, chat, presign, workspace) **จริง ๆ เป็น 🟢 Done แล้ว** ให้ยึด "Reality Check + Next Sprint" ด้านบนเป็นสถานะปัจจุบัน

---

## 1️⃣ Frontend Track — UI/UX · State Management · Client Optimization

> **อัปเดตตามโค้ดจริง (audit 15 มิ.ย. 2026):** หน้า/คอมโพเนนต์ activation ทั้งหมด (KPI, narrative, drill-down, override, chat, upload) **สร้างเสร็จแล้ว** — Frontend track เกือบ 🟢 Done ทั้งหมด เหลือ polish + งาน Pro-Max
> *หลักฐาน:* `app/(dashboard)/dashboard/page.tsx` (KPI + narrative + href drill-down), `transactions/page.tsx` (override `<select>` + URL filters), `action-items/page.tsx` (Recommendation + evidence), `assistant/page.tsx` (chat + citations), `upload/page.tsx` (progress state machine), `components/shared/{StatCard,Skeleton,ThemeToggle}.tsx`, `app/globals.css` (design tokens + dark mode)

| ชื่องาน / ฟีเจอร์ | รายละเอียดเทคนิค | สถานะ | Priority | ฝ่าย/ผู้รับผิดชอบหลัก | ผลลัพธ์เชิงประสิทธิภาพ (Impact) |
|---|---|---|---|---|---|
| Civic Explorer (Treemap/Sunburst/Map) | D3 treemap + sunburst, Leaflet map, year selector, drill-down, YoY compare, red-flag overlay, embed widget — Server Components อ่านจาก in-memory tree cache | 🟢 Done | High | Frontend | `MinistryTreemap` · `SunburstChart` · `BudgetMapView` · embed routes ครบ |
| Business Dashboard (cash flow + category) | Recharts bar + pie + budget vs actual, Client Components สำหรับ filter; ดึง `/api/business/analytics/summary` ผ่าน SWR | 🟢 Done | High | Frontend | ผู้ใช้เห็นภาพรวมใน session แรก |
| Forecast View | Line chart 6 เดือน (WMA + Seasonal), cash runway indicator, what-if slider | 🟢 Done | Med | Frontend | เครื่องมือวางแผน ไม่ใช่กระจกส่องอดีต |
| Reports & Export UI | CSV (streaming) + PDF + open-data JSON; หน้า `report/[id]/{overview,detail,anomalies,export,print}` | 🟢 Done | Med | Frontend | ส่งมอบคุณค่าออกนอกระบบ |
| **KPI cards** (net cash flow · burn rate · runway · top leak) | KPI row + secondary KPI row บน dashboard, ดึง `summary.{burnRate,cashRunwayMonths,topLeak}`, gate Pro | 🟢 Done | High `I5·E1` | Frontend | ผู้ใช้เห็นตัวเลขชี้ขาดทันที |
| **Narrative summary card** (Layer 3, rule-based) | ประกอบ `narrativeText` จาก `DiagnosticInsight.summary` + fallback rule + `narrativeHref` → `/transactions?category=&month=` (drill-down) | 🟢 Done | High | Frontend | 60% ที่แทน dashboard เก่า — ไม่มีต้นทุน LLM/PDPA |
| **Transaction drill-down + ปุ่ม "ดูข้อมูลจริง"** (Layer 2) | narrative/leak/chat citation → `/transactions` อ่าน `searchParams` (category/leakFlag/month/search/page) | 🟢 Done | High `I5·E2` | Frontend | 40% ที่รอด = หลักฐานกัน AI หลอน |
| **Actionable Today** (Layer 3) | `action-items/page.tsx` — Recommendation, PENDING-first + priority sort, `evidenceFor()` drill-down | 🟢 Done | Med | Frontend | retention; ใช้ table ที่มีอยู่ |
| **Override category UI** | inline `<select>` ต่อ transaction → `onSave` → บันทึก `CategoryRule` (labeled data ฟรีสำหรับ ML) | 🟢 Done | High `I4·E2` | Frontend | flywheel: ทุก override = training label |
| **Upload job status + progress** | state machine `status`/`progressStep` + presign → Firebase PUT → confirm; progress UI ราย step | 🟢 Done | Med `I3·E1` | Frontend | แก้ไฟล์ timeout — *ดูหมายเหตุ #1* |
| **Chat / NLQ box** (Layer 3) | `assistant/page.tsx` — message list, POST `/api/business/chat`, citation → href drill-down, ไม่แตะ raw data | 🟢 Done | High `I5·E4` (PRO) | Frontend | differentiation (rule-based; LLM จริงเป็น P2) |
| Vendor profile | `vendors/page.tsx` + `/api/business/vendors` (GROUP BY counterparty) | 🟢 Done | High `I4·E2` (PRO) | Frontend | เหตุผล upgrade Pro |
| In-app anomaly/leak surfacing | dashboard นับ `anomalyCount`/`criticalCount` + leak badges; หน้า settings/notifications สำหรับ channel | 🟢 Done | Med `I3·E2` | Frontend | เตือนในแอป (channel LINE = ดูหมายเหตุ #2) |
| **In-app budget threshold banner** | `BudgetAlertBanner` — หมวดที่ใช้จ่าย ≥85% (เตือน) / >100% (เกิน) ของงบ, drill-down → `/transactions`, dismissible, gate Pro | 🟢 Done | Med `I3·E2` (PRO) | Frontend | เตือนก่อนงบบานปลาย |
| Theme tokens + dark mode | `app/globals.css` CSS-var tokens (civic/business dual-mode) + `ThemeToggle` (light/dark/system) | 🟢 Done | Med | Frontend | UI สม่ำเสมอ — dev ใหม่ทำหน้าใหม่ได้ตรงกัน |
| Fiscal Overview | macro trend chart 2560–2568, `fiscal-overview/page.tsx` | 🟢 Done* | Low | Frontend | *ขยาย series + interactivity (lightweight-charts) = backlog |
| **Vendor sparkline trend** | `Sparkline` (Recharts LineChart) + `trendPct` + sort "แนวโน้มเพิ่มเร็วสุด" ในหน้า vendors | 🟢 Done | Med `I4·E2` (PRO) | Frontend | เห็น "supplier ไหนแพงขึ้นเรื่อย ๆ" |
| **Goal tracking + budget gauge** | budget-utilization gauge ทำได้จาก `Budget` ที่มี — แต่ goal/saving-target ต้องมี `Goal` model ก่อน (ยังไม่มีใน schema) | 🔵 ToDo *(บล็อก: Goal model @ DB track)* | Med `I4·E3` (PRO) | Frontend + DB | retention เชิงวางแผน |
| **[Pro-Max] Skeleton + optimistic UI + error boundaries** | `components/shared/Skeleton.tsx` (shimmer) บน 5 หน้า + optimistic `mutate` ตอน override (rollbackOnError) + `(dashboard)/error.tsx` | 🟢 Done | Med | Frontend | perceived perf + เสถียรเมื่อ API ช้า |
| Wire `report/[id]` ออกจาก mock-data | server component อ่าน File + transactions จริง, ลบ `lib/mock-data.ts` แล้ว | 🟢 Done | **High** | Frontend | ตัด mock จุดสุดท้าย (Next Sprint #4 เสร็จ) |
| **[Pro-Max] Component Storybook + visual regression** | Storybook + Chromatic snapshot สำหรับ charts/cards | 🔵 ToDo | Low | Frontend + QA | กัน UI regression เวลาหลายคนแก้ |
| **[Pro-Max] a11y + i18n number/date pass** | aria บน chart/badge, จัด format เลข/วันที่ไทย (พ.ศ.) ให้รวมศูนย์ | 🔵 ToDo | Low | Frontend | คุณภาพ + เข้าถึงได้ |

**หมายเหตุที่กระทบ Frontend:**
> **#1 Upload progress** — ใช้ step-based state machine (ไม่ใช่ polling 2 วิ ตาม v2) ใช้งานได้จริงแล้ว; ถ้างาน parse ยาวเกิน serverless timeout ค่อยเพิ่ม job-status polling ทีหลัง
> **#2 LINE channel** — ปุ่ม/หน้า settings ผูกกับ **LINE Notify ที่ปิดบริการแล้ว** (P0 ใน Next Sprint) — UI ส่วน connect LINE ต้องรื้อตาม backend ตอนย้ายไป Messaging API

---

## 2️⃣ Backend Track — API Architecture · Business Logic · Security · Performance

> **อัปเดตตามโค้ดจริง:** API routes ครบ ~55 เส้น (`apps/web/app/api`) — narrative/drill-down/vendor/chat/Stripe **Done แล้ว**; ที่ยัง ToDo จริงคือ scheduler ของ report, share link, VAT/e-Tax, email-forward และ **LINE ที่ต้องย้ายออกจาก Notify ที่ตายแล้ว**

| ชื่องาน / ฟีเจอร์ | รายละเอียดเทคนิค | สถานะ | Priority | ฝ่าย/ผู้รับผิดชอบหลัก | ผลลัพธ์เชิงประสิทธิภาพ (Impact) |
|---|---|---|---|---|---|
| API Gateway (Next.js API Routes) | รับทุก request → JWT verify → `requireAuth()`/`requireAdmin()` → `planGate()` (FREE/PRO/TEAM) → route → JSON; กระจายไป Prisma/Neon, FastAPI, Stripe | 🟢 Done | High | Backend | จุดควบคุม auth/plan/route ชุดเดียว |
| Middleware stack ครบ 6 ขั้น | parse `auth_token`/Bearer → JWT → guard → planGate → rate limit (IP hash, 429) → handler | 🟢 Done | High | Backend + DevOps | กัน abuse + บังคับ plan ก่อน DB query |
| FastAPI Parser microservice | `:8000` Railway/Render — pdfplumber, openpyxl+pandas; PDF/Excel/Bank/Accounting (SCB/KBANK/BBL, PEAK, FlowAccount) | 🟢 Done | High | Backend (Python) | แยก parsing หนักออกจาก Next.js |
| Auto-categorize (heuristic) | `CategoryRule` heuristic ที่ user สอนเอง (เลี่ยง cold start ของ ML) | 🟢 Done | High | Backend | แม่นพอในช่วงไม่มี labeled data |
| Leak detection (Outlier + Spike + Duplicate) | z-score outlier, spike, duplicate flags → `Transaction.leakFlag`/`leakSeverity` | 🟢 Done | High | Backend | Tier 2 Diagnostic — moat บริบทไทย |
| Analytics 4-Tier engine | Tier1 Descriptive (rollup) · Tier2 Diagnostic (z-score) · Tier3 Predictive (WMA + Seasonal, runway) · Tier4 Prescriptive (if-then → Recommendation) | 🟢 Done | High | Backend | ครบ pipeline วิเคราะห์ |
| WMA + Seasonal forecast + what-if | weighted moving average + seasonal index, recalc what-if on-the-fly — **เปิดเผยว่าไม่ใช่ ML** | 🟢 Done | Med | Backend | คาดการณ์โปร่งใส ไม่ overclaim |
| Recommendation engine | สร้าง Recommendation (PENDING/priority) เลี้ยง "Actionable Today" | 🟢 Done | Med | Backend | วัตถุดิบ Layer 3 |
| Narrative generation (rule-based) | `lib/assistant/rules.ts` + dashboard ประกอบ narrative จาก `DiagnosticInsight.summary` → Thai template | 🟢 Done | High | Backend | narrative ตรวจสอบได้ ไม่มีต้นทุน LLM |
| Drill-down (insight → raw tx) | `/api/business/transactions` รับ filter `category/leakFlag/month/search`; insight ผูก `relatedTxIds` | 🟢 Done | High | Backend | ผูก Layer 2 verification |
| Vendor aggregation API | `/api/business/vendors` GROUP BY counterparty | 🟢 Done | High `I4·E2` | Backend | ตอบ "supplier ไหนแพงขึ้น" *(ขาด index — ดู Database)* |
| Thai Q&A / assistant | `/api/business/chat` + `lib/assistant/context` — ส่งเฉพาะ governed aggregates, citation drill-down, **ไม่แตะ raw tx** | 🟢 Done | High `I5·E4` (PRO) | Backend | differentiation (rule-based engine) |
| Stripe payment flow | `/api/subscription/checkout` + `/api/webhooks/stripe` (verify signature) → อัปเดต plan | 🟢 Done | High | Backend | เปิดรายได้จริง |
| API keys / developer portal | `/api/developer/keys` + `ApiKey` model — external API access | 🟢 Done | Med | Backend | ต่อยอด integration |
| Workspace / RBAC API | `/api/workspace/*` + members + comments | 🟢 Done | Med (TEAM) | Backend | รองรับ Team plan |
| **Manual PDF report export** | `/api/business/report/[id]/export/pdf` + หน้า print — export ได้ตามต้องการ | 🟢 Done | Med | Backend | คุณค่าออกนอกระบบ |
| **LINE alert** | `lib/line-notify.ts` + `alert-triggers` ทำงานแล้ว **แต่ยิงไป LINE Notify ที่ปิดบริการ (มี.ค. 2025)** | 🔴 ต้องแก้ | **P0** `I5·E3` (PRO) | Backend | ⚠️ ต้องย้ายไป **Messaging API** มิฉะนั้น alert พังเงียบ |
| **Scheduled monthly report** | export ทำได้แล้ว แต่ **ยังไม่มี scheduler** (ไม่มี `vercel.json` cron / QStash) → ส่งอัตโนมัติสิ้นเดือนยังไม่ทำงาน | 🟡 Doing | High `I5·E3` (PRO) | Backend + DevOps | recurring value กัน cancel |
| Accountant share link | token read-only หมดอายุ + revoke + log — **ยังไม่มี route** | 🔵 ToDo | High `I4·E2` (PRO) | Backend | viral loop ผ่านนักบัญชี |
| VAT-ready expense export | แยกภาษีซื้อ-ขายตามเดือน — **ยังไม่มี** | 🔵 ToDo | High `I4·E2` (PRO) | Backend | pain รายเดือนของ SME |
| Email-forward statement | forward ไฟล์เข้า inbox ระบบ → parser เดิม — **ยังไม่มี** | 🔵 ToDo | Med `I4·E3` (PRO) | Backend | ตัวแทน Open Banking ที่ทำได้วันนี้ |
| e-Tax invoice import (สรรพากร) | import e-Tax หลัง VAT export | 🔵 ToDo | Low `I3·E4` (PRO) | Backend | ต่อยอดกลุ่มภาษี |
| LLM upgrade ของ Q&A | ต่อ Claude API ทับ intent→query เดิม (aggregated only, mask counterparty) | 🔵 ToDo | Med `I5·E4` (PRO) | Backend | free-form Q&A เต็มรูป |
| Open Banking ไทย | **Watch item** — รอ framework ธปท. | 🔵 Watch | Low `I5·E5` | Backend | ลงมือเมื่อมีมาตรฐานจริง |
| **[Pro-Max] API versioning + OpenAPI contract** | `/api/v1/*` + สร้าง OpenAPI spec อัตโนมัติจาก zod schema | 🔵 ToDo | Med | Backend | กระจายงาน frontend/3rd-party ได้โดยไม่ break |
| **[Pro-Max] Idempotency keys + DLQ** | idempotency-key บน upload/payment/webhook, dead-letter queue บน job ที่ fail | 🔵 ToDo | Med | Backend + DevOps | กัน double-charge / double-insert, job ไม่หาย |
| **[Pro-Max] Structured logging + request tracing** | pino + request-id propagate ข้าม Next.js ↔ FastAPI | 🔵 ToDo | Med | Backend + DevOps | debug ข้าม service ได้เร็ว |

---

## 3️⃣ Database Track — Schema · Query Optimization · Caching · Data Governance

> **อัปเดตตามโค้ดจริง:** `schema.prisma` มี ~30 models + index แน่น (`Transaction`: `userId,date` · `category` · `leakFlag` · `userId,rowHash` · `userId,softKey`) ครบ; ที่ยังขาดจริงคือ **index `counterparty`**, **`Goal` model**, **pg_trgm**, และ sanity-check หลัง parse

| ชื่องาน / ฟีเจอร์ | รายละเอียดเทคนิค | สถานะ | Priority | ฝ่าย/ผู้รับผิดชอบหลัก | ผลลัพธ์เชิงประสิทธิภาพ (Impact) |
|---|---|---|---|---|---|
| Neon PostgreSQL + Prisma ORM | serverless `ap-southeast-1`, pooled + direct URL, type-safe queries + migrations | 🟢 Done | High | Database | source of truth ฝั่ง write |
| In-memory civic tree cache | `Map<year, CivicBudgetYear>` lazy-load จาก `data/budget-XXXX.json`, rebuild on start — **civic read path เดียว, ห้ามอ่าน Postgres** | 🟢 Done | High | Database + Backend | `/explore` เร็ว ไม่แตะ DB |
| Civic write-side staging | `BudgetLineItem` (flat) → ETL aggregate → `CivicBudgetYear` JSON tree; `deleteMany` by fiscalYear ตอน replace | 🟢 Done | Med | Database | แยก write/read ชัดเจน |
| `rawValues Json?` บน Transaction | เก็บ row ก่อน normalize ไว้สำหรับ ML retraining (Phase 3) — **ห้าม strip** | 🟢 Done | High | Database | ฐานของ data flywheel |
| Version race guard | `@@unique([fiscalYear, version])` + `prisma.$transaction` ครอบ admin upload | 🟢 Done | High | Database | กัน data version ชนกัน |
| Civic indexes (search) | index Ministry/Dept/Project สำหรับ `/search` + `/export` | 🟢 Done | Med | Database | query ค้นเร็ว |
| Core business models | `Transaction` · `CategoryRule` · `MonthlyFinancialSummary` · `DiagnosticInsight` · `ForecastSnapshot` · `Recommendation` · `Alert` · `Budget` ครบ | 🟢 Done | High | Database | ฐานของทุก analytics |
| Team/Fiscal/API models | `Workspace`/`WorkspaceMember`/`WorkspaceFile` · `ProjectComment` · `ApiKey` · `FiscalYearSummary` | 🟢 Done | Med | Database | รองรับ Team + Fiscal + dev portal |
| Transaction indexing | `@@index` บน `userId,date` · `category` · `leakFlag` · `userId,rowHash` · `userId,softKey` (กัน dup) | 🟢 Done | High | Database | query/dedup เร็ว |
| Admin audit trail | `AdminLog` + `lib/admin-audit.ts` log การกระทำของ admin | 🟢 Done | Med | Database | ย้อนสอบฝั่ง admin ได้ |
| **One View One Truth — metric definitions** | `lib/analytics/{summary,predict}.ts` + `forecaster.ts` รวมสูตรแล้ว — เหลือ **audit ว่า dashboard/forecast/chat อ่าน source เดียวกัน** + ดึงเป็น `lib/metrics.ts` ถ้าซ้ำ | 🟡 Doing | **High** | Database + Backend | กัน conflicting numbers |
| **Index `(userId, counterparty)`** | vendor GROUP BY ปัจจุบัน **ยังไม่มี index** counterparty | 🔵 ToDo | High | Database | vendor/drill-down ต้องไวเมื่อ data โต |
| Full-text search (pg_trgm) | GIN index + similarity (transactions ตอนนี้ใช้ `contains` พื้นฐาน) | 🔵 ToDo | Med `I3·E2` | Database | retention feature เงียบแต่ทรงพลัง |
| `Goal` model | targetAmount vs actual net — **ยังไม่มีใน schema** (มีแต่ `Budget`) | 🔵 ToDo | Med `I4·E3` | Database | รองรับ goal/saving gauge |
| MoM/YoY comparison rollup | ต่อยอด `MonthlyFinancialSummary` ที่มีแล้ว | 🔵 ToDo | Med `I3·E3` (TEAM) | Database | รายงานเทียบช่วง |
| Civic × Business bridge schema | JOIN `BudgetLineItem` ↔ `Transaction.category` (มี `BudgetLineItem` แล้ว, ขาด dataset จริง) | 🔵 ToDo | Low (Long bet) | Database | moat cross-domain (2/5) |
| **[Pro-Max] Sanity-check หลัง parse** | ตรวจยอดรวม + จำนวนแถวหลัง parse; confidence ต่ำ → flag "โปรดตรวจสอบ" แทนเงียบ | 🔵 ToDo | **High** | Database + QA | กัน parser พังเงียบ (ความเสี่ยงสูงสุด) |
| **[Pro-Max] User-action audit + soft-delete + retention** | ขยาย audit ครอบ override/share/export, soft-delete, retention ตาม key (uploads 90 วัน / exports 24 ชม.) | 🔵 ToDo | Med | Database + Governance | รองรับ PDPA + ย้อนสอบเต็ม |
| **[Pro-Max] Read replica / materialized view** | แยก analytics query ออกจาก OLTP เมื่อ data โต | 🔵 ToDo | Low | Database | กัน dashboard ทำ DB หน่วง |

---

## 4️⃣ DevOps & CI/CD Track — Infrastructure · Deploy · Automation · Rate Limit · Monitoring

> **อัปเดตตามโค้ดจริง:** storage = **Firebase** (ไม่ใช่ R2), redis/ratelimit = **Upstash**, email = **Resend** — ทั้งหมดต่อแล้ว; **คอขวดจริงตอนนี้ย้ายมาที่ CI/test (ไม่มีเลย), Monitoring (ไม่มี), และ cron scheduler ที่ยังไม่ผูก** (`vercel.json` ไม่มีในรีโป)

| ชื่องาน / ฟีเจอร์ | รายละเอียดเทคนิค | สถานะ | Priority | ฝ่าย/ผู้รับผิดชอบหลัก | ผลลัพธ์เชิงประสิทธิภาพ (Impact) |
|---|---|---|---|---|---|
| Vercel + Railway/Render deploy | Next.js บน Vercel, FastAPI parser บน Railway/Render | 🟢 Done | High | DevOps | แยก runtime frontend/parser |
| Edge rate limiting (Step 1 middleware) | `@upstash/ratelimit` รันก่อน JWT/DB: upload 5/min, auth 10/min, api 60/min — **ขั้นแรกเสมอ** | 🟢 Done | High | DevOps + Backend | กัน abuse/DoS ต้นทาง |
| **Object Store + Presigned upload** | `firebase-admin` Storage (prod) + local fallback (dev) — `presign` → client PUT → `confirm`; FastAPI อ่านผ่าน `lib/file-storage.ts` | 🟢 Done | High | DevOps + Backend | *(เดิมวางเป็น R2 — โค้ดใช้ Firebase; อัปเดต doc)* |
| Redis / cache infra | `@upstash/redis` (ratelimit + cache) | 🟢 Done | High | DevOps | ฐานของ rate limit + งานเบื้องหลังเบา ๆ |
| Email infra (Resend) | `resend` dep ต่อแล้ว — **เหลือยืนยัน SPF/DKIM/DMARC + in-app fallback** | 🟡 Doing | High | DevOps | deliverability = feature |
| Orphan cleanup cron | route `GET /api/internal/cleanup-orphans` + `CRON_SECRET` พร้อม — **แต่ยังไม่มี `vercel.json` ตั้ง schedule จริง** | 🟡 Doing | Med | DevOps | กันไฟล์/record ค้าง (ต้องผูก cron) |
| Job scheduler (สำหรับ scheduled report) | ยังไม่มี QStash/Vercel Cron ผูก → report อัตโนมัติยังไม่ทำงาน | 🔵 ToDo | High | DevOps | เปิด recurring report (Backend รอตัวนี้) |
| PDF generation lib | export route มีแล้ว แต่ **ไม่มี `react-pdf`/`puppeteer` ใน deps** → ยืนยันว่าใช้ print/HTML; เลือก lib ถาวร (react-pdf) | 🟡 Doing | Med | DevOps + Backend | monthly report เรือธง Pro |
| **LINE OA setup (Messaging API)** | provision channel + access token + rich menu + account link — **แทน LINE Notify ที่ตายแล้ว** | 🔴 ToDo | **P0** | DevOps | ช่องทางหลักตลาดไทย (alert ใช้ไม่ได้จนกว่าจะย้าย) |
| External data connectors (cron ETL) | scheduled job ดึง สศค./BOT fiscal, SET contractor lookup | 🔵 ToDo | Low (Phase 2) | DevOps | feed Fiscal Intelligence |
| **CI pipeline (lint/type/test/build gate)** | GitHub Actions: `tsc --noEmit` + ESLint + test + `prisma validate` ก่อน merge — **ยังไม่มี `.github/workflows` เลย** | 🔵 ToDo | **P0** | DevOps + QA | กัน regression, กระจายงานหลายคนได้ปลอดภัย |
| **Monitoring & alerting** | Sentry (error) + uptime + log drain — **ยังไม่มี Sentry ในรีโป** | 🔵 ToDo | **High** | DevOps | รู้ปัญหาก่อนผู้ใช้แจ้ง |
| **[Pro-Max] Preview env + Neon branching** | Vercel preview ต่อ PR + Neon branch ต่อ PR | 🔵 ToDo | Med | DevOps | ทดสอบแยกก่อน merge |
| **[Pro-Max] Secrets management + IaC** | secrets ใน Vercel/Doppler, infra-as-code (storage/redis/queue) | 🔵 ToDo | Med | DevOps | reproducible + ปลอดภัย |
| **[Pro-Max] Rollback & migration safety** | expand-contract migration, feature flag, rollback trigger เอกสารก่อน deploy | 🔵 ToDo | Med | DevOps + Database | ship ปลอดภัยขึ้น |

---

## 5️⃣ QA & AI Governance Track — Testing · Code Quality · AI Alignment / Anti-Hallucination

| ชื่องาน / ฟีเจอร์ | รายละเอียดเทคนิค | สถานะ | Priority | ฝ่าย/ผู้รับผิดชอบหลัก | ผลลัพธ์เชิงประสิทธิภาพ (Impact) |
|---|---|---|---|---|---|
| File sanitization | `sanitizeStringField()` (CSV injection) + `containsMacros()` (XLSX VBA) เรียกก่อน DB insert — **ห้ามถอด** | 🟢 Done | High | QA/Security | กัน injection/macro |
| Pre-upload validation | `Content-Length` + extension whitelist ก่อน `file.arrayBuffer()` | 🟢 Done | High | QA/Security | กัน memory exhaustion |
| TypeScript strict (no `any`) | strict mode, functional components, conventional commits | 🟢 Done | Med | QA/Code Quality | code health พื้นฐาน |
| **Verification layer (anti-hallucination)** | ทุก narrative มีปุ่ม "ดูข้อมูลจริง" → dashboard = source of truth กัน AI พูดเกินข้อมูล | 🟡 Doing | **High** | QA/AI Governance + Frontend | กลไกหลักกัน AI หลอน (40% ที่รอด) |
| **One View One Truth enforcement** | test ว่าเลขเดียวกันตรงทุกหน้า (narrative=chart=Q&A) | 🟡 Doing | High | QA + Database | กัน conflicting numbers |
| **PDPA Gate (ก่อนเปิด Chat Phase 3)** | ① consent แยกตอนเปิด Q&A ② ส่งเฉพาะ aggregated ③ mask counterparty ก่อนส่ง LLM ④ ระบุใน privacy policy | 🔵 **ToDo (คอขวด #3)** | **High** | QA/AI Governance + Backend | บล็อก Phase 3 จนกว่าจะเสร็จ; ความเสี่ยง #1 |
| Bank statement snapshot tests | snapshot test ต่อ format/ธนาคาร + sanity check ยอดรวม/แถว | 🔵 ToDo | **High** | QA | กัน parser พังเงียบเมื่อแบงก์เปลี่ยน layout |
| LLM cost guardrails | intent→query (token น้อย) + rate limit/user + model เล็กสำหรับ intent classification; เป้า cost/user < 10% ARPU | 🔵 ToDo | High | QA/AI Governance + Backend | กัน margin หาย (ARPU ฿299) |
| Managed data / human-in-the-loop | override = labeled data feed กลับ ML แบบมี audit; share link revoke + log | 🔵 ToDo | Med | QA/Governance | คุณภาพ label + ตามรอยได้ |
| ML accuracy gate (Phase 3) | auto-categorize accuracy ≥ 85% บน data จริงก่อน rollout | 🔵 ToDo | Med | QA + Backend | กันแนะนำผิด → เสียความเชื่อ |
| Email deliverability test | inbox-placement test, ตรวจ SPF/DKIM/DMARC | 🔵 ToDo | Med | QA + DevOps | scheduled report ไม่ลง spam |
| **[Pro-Max] Test pyramid + coverage gate** | unit (analyzers/parsers) + integration (API routes) + e2e (Playwright critical path) ผูกใน CI | 🔵 ToDo | **High** | QA | กระจายงานได้โดยไม่ break |
| **[Pro-Max] Golden-dataset eval สำหรับ narrative/Q&A** | ชุดคำถาม-คำตอบมาตรฐาน วัด regression ของ Layer 3 ทุก release | 🔵 ToDo | Med | QA/AI Governance | จับ AI หลอน/ตอบเพี้ยนอัตโนมัติ |
| **[Pro-Max] Contract testing (Next.js ↔ FastAPI)** | Pact/schema test กัน parser response เปลี่ยนแล้ว backend พัง | 🔵 ToDo | Med | QA | ข้าม-service ปลอดภัย |
| **[Pro-Max] Security review cadence + dependency scan** | Dependabot/`npm audit` + review PR ตาม checklist (rate limit, sanitize, planGate) | 🔵 ToDo | Med | QA/Security | กัน regress ของ security ที่ live แล้ว |

---

## 🧭 ลำดับลงมือแนะนำ (Critical Path)

1. **เคลียร์คอขวดฐาน (Phase 1 ปิด + เตรียม Phase 2):** ล็อก metric definitions (One View One Truth) → KPI cards → drill-down + narrative + Actionable Today → override→CategoryRule. *ทั้งหมดใช้ data/แพ็กเกจที่มีแล้ว ไม่มีต้นทุน LLM/PDPA.*
2. **วาง Infra ก่อนของขาย (สัปดาห์ 7–8):** R2 + Presigned URL → BullMQ+Redis → Email(SPF/DKIM) + react-pdf → LINE OA. *สามตัวกลางเป็น dependency ของทุก feature Phase 2.*
3. **Monetization:** Scheduled report → LINE alert → Accountant share → VAT export → Goal/gauge → full-text search.
4. **Differentiation (Phase 3, หลัง PDPA Gate เสร็จ):** Thai Q&A (intent→query→Claude, aggregated only) → ML auto-categorize (มี label จาก Phase 1 แล้ว) → Sheets/webhook.
5. **Long bet / Watch:** Civic×Business bridge (ต้องมี BudgetLineItem จริงก่อน) · Open Banking ไทย (รอ framework ธปท.).

> **กฎเหล็กที่ฝังในบอร์ด:** ① Forecast = WMA/Seasonal **เปิดเผยว่าไม่ใช่ ML** เสมอ ② Civic read = cache เท่านั้น ห้ามอ่าน Postgres ③ Rate limiting เป็นขั้นแรกของ middleware ④ ไม่ส่ง raw transaction เข้า LLM — aggregated + mask เท่านั้น ⑤ คู่แข่งจริงคือ Excel ของ SME ไทย ไม่ใช่ ChatGPT — moat = ข้อมูล + บริบทไทย
