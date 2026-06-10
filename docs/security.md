# Security & input validation

> ส่วนขยายจาก CLAUDE.md — รายการ checklist ด้าน security ที่ต้องทำตามตอน implement

- **File upload limits**: max 10MB per file, `.xlsx`/`.xls`/`.csv` MIME-type allowlist enforced server-side (not just by extension). Reject anything else with a Thai error message.
- **Spreadsheet formula/macro injection**: when parsing user-uploaded Excel (`openpyxl`/`pandas`), strip or ignore cell formulas (`=CMD(...)`, `=HYPERLINK(...)`) and reject `.xlsm` (macro-enabled) files outright — these are a known CSV/Excel injection vector.
- **Auth**: passwords hashed with bcrypt/argon2 (never store plaintext), rate-limit login/register/forgot-password endpoints, session tokens via httpOnly cookies (not localStorage).
- **Authorization**: every Business Layer API route checks `userId` ownership of the requested `fileId`/`reportId` — never trust a client-supplied ID alone (IDOR risk).
- **Civic Layer public API rate limiting**: `/api/civic/search`, `/api/civic/export/*` are unauthenticated and return bulk data — apply per-IP rate limiting (e.g. via middleware) to prevent scraping/abuse from degrading performance for real users.
- **Secrets**: DB URL, OAuth client secrets, session signing keys in environment variables only, never committed. `.env.example` checked in, `.env` gitignored.

## Coding conventions

- **TypeScript**: Strict mode, no `any` types. Use interfaces for data shapes, types for unions.
- **Components**: Functional components only. Use custom hooks for shared logic. One component per file.
- **Naming**: PascalCase for components, camelCase for functions/variables, UPPER_SNAKE for constants, kebab-case for files/folders.
- **Styling**: Tailwind utility classes. Use shadcn/ui for form controls, dialogs, toasts. No inline style objects.
- **State**: React state for local. React Context for auth/theme. Server Components for static Civic Layer data, Client Components for interactive filters.
- **Data fetching**: Civic Layer = static at build/server start (cached in memory). Business Layer = SWR for client-side fetching with revalidation.
- **API calls**: Use fetch with proper error handling. Create typed API client functions in `/lib/api.ts`.
- **Error handling**: User-friendly Thai error messages. Toast notifications for actions. Error boundaries for pages.
- **Commits**: Conventional commits — `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`. Commit 1-2 times per day.
- **Branching**: Feature branches from `main`. Branch name: `feat/feature-name`, `fix/bug-name`.
- **Python (parser)**: Type hints, PEP 8, pydantic for validation, async FastAPI endpoints.
