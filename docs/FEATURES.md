# Kisan Vakil — Feature Matrix + Implementation Notes

This doc tracks what is **Implemented / In progress / Not done** in this repo, and how to extend it.

Legend:
- ✅ Implemented = usable end-to-end (UI + API + validation) or a complete building block
- 🟡 In progress = partially implemented (API-only, UI-only, heuristics-only, or missing edge cases)
- ⛔ Not done = planned but not started

## 1) What’s already in the codebase (anchors)

### Auth / Sessions (Better Auth)
- Better Auth is wired at `lib\\auth\\auth.ts` with:
  - Email+password
  - Passkeys plugin
  - 2FA plugin
  - Multi-session plugin
- Next.js handler at `app\\api\\sessions\\[...all]\\route.ts`.
- “Manage Sessions” UI in the sidebar user menu:
  - `components\\features\\profile\\settings\\sessions-item.tsx`
  - Device parsing: `ua-parser-js`

### “NavUser” + “Edit Profile” UX (codesprint-style)
- Sidebar user menu component: `components\\layout\\user\\nav-user.tsx`
- “Edit Profile” is a dialog (not a separate “profile page”):
  - UI: `components\\features\\profile\\settings\\edit-profile-item.tsx`
  - API: `app\\api\\farmer-profiles\\route.ts`
  - DB: `farmer_profiles` in `lib\\db\\kisan.schema.ts`

### Document Vault building blocks (DB + REST)
- DB table: `documents` in `lib\\db\\kisan.schema.ts`
- REST endpoints:
  - `GET/POST /api/documents` → `app\\api\\documents\\route.ts`
  - `GET/PATCH/DELETE /api/documents/:id` → `app\\api\\documents\\[id]\\route.ts`
- Uploadthing handler exists:
  - Route: `app\\api\\uploads\\route.ts`
  - Router: `lib\\uploads\\router.ts` (currently `avatarImage` only)

### Land parcels building blocks (DB + REST)
- DB table: `land_parcels` in `lib\\db\\kisan.schema.ts`
- REST endpoints:
  - `GET/POST /api/land-parcels` → `app\\api\\land-parcels\\route.ts`
  - `GET/PATCH/DELETE /api/land-parcels/:id` → `app\\api\\land-parcels\\[id]\\route.ts`

### Document Analyzer (OCR → translate → highlights → ask)
- Page: `app\\[locale]\\dashboard\\translator\\page.tsx`
- UI: `components\\features\\translator\\document-analyzer.tsx`
- OCR (Gemini) + translation (Sarvam): `app\\api\\translate-document\\route.ts`
- TTS: `app\\api\\tts\\route.ts`
- Clause/law/record highlights:
  - States list: `utils\\india-states.ts`
  - Heuristics: `utils\\document-highlights.ts`

### Chat endpoint (Groq via AI SDK) + optional Upstash caching
- Route: `app\\api\\chats\\route.ts`
- Supports streaming and non-streaming.

---

## 2) Feature matrix

### ✅ Implemented

1) **NavUser (sidebar user menu)**
- Where: `components\\layout\\user\\nav-user.tsx`
- Includes: Edit Profile, Sessions, Passkeys, 2FA, Change Password, Sign out.

2) **Edit Profile (farmer/legal context)**
- Where: `components\\features\\profile\\settings\\edit-profile-item.tsx`
- API: `GET/PUT /api/farmer-profiles`
- DB: `farmer_profiles`
- Fields: language, support need, trusted helper, location.

3) **Multi-session management + device labels (ua-parser-js)**
- Where: `components\\features\\profile\\settings\\sessions-item.tsx`
- Backed by Better Auth multi-session endpoints.

4) **Document Analyzer: upload → extract → translate**
- Where: `components\\features\\translator\\document-analyzer.tsx`
- API: `POST /api/translate-document`

5) **TTS (audio playback for translated text)**
- Where: `components\\features\\translator\\tts-player.tsx`
- API: `POST /api/tts`

6) **Highlights tab (basic, heuristic)**
- Where: `utils\\document-highlights.ts` + analyzer UI
- Detects: section refs, central law mentions, clause keywords, land-record terms.

7) **India states + UT selection utility**
- Where: `utils\\india-states.ts`
- Source: Wikipedia page lists **28 states + 8 UTs** (verified).

### 🟡 In progress

1) **Document Vault (end-to-end)**
- Status: API + DB exist; user-facing “vault” UI/flows are not yet a first-class feature.
- What’s missing:
  - Uploadthing router for document PDFs/images (not just avatar)
  - UI: browse/search, tag to land parcel, share with family helper, offline drafts

2) **Land Parcels UX (end-to-end)**
- Status: API + DB exist; UI for create/edit/attach documents isn’t shipped.

3) **Legal / clause highlighting quality**
- Status: Works as “red-flag scanner lite” via heuristics.
- What’s missing:
  - Real taxonomy of Indian acts + state amendments with citations
  - State-specific “land record portal terms” beyond the current keyword mapping
  - Explainability: show *why* something was highlighted + suggested next step

4) **Chat “Expert” persona (legal + farming)**
- Status: chat route exists.
- What’s missing:
  - UI surface in dashboard with guardrails, conversation history, and doc-context
  - Safety + non-advice disclaimers and escalation flows

### ⛔ Not done (planned)

1) **Land record lookup (khata/khasra/mutation/ownership history)**
2) **Scheme eligibility checker + application guidance**
3) **Legal notice generator + template library**
4) **Complaint / grievance filing flows** (electricity/irrigation/revenue/mandi)
5) **Case tracker** (dates, reminders, status)
6) **Fraud / red-flag checker (contract + land sale + loan terms)**
7) **Evidence capture** (photos/video + timestamp + geotag)
8) **Offline mode** (document vault + drafts)
9) **Family sharing / trusted helper access model**
10) **Real-time notifications** (Pusher) for reminders/status

---

## 3) How to implement the missing pieces (practical playbooks)

### A) Document Vault (finish it end-to-end)

Goal: a farmer can safely store papers, and a helper can assist.

1. **Expand Uploadthing router** (`lib\\uploads\\router.ts`)
   - Add routes like `documentFile` (PDF/images) with higher size limits.
   - Middleware: attach authenticated userId (recommended) and enforce quotas.

2. **Write the “vault UI”** (drawer-first)
   - Recommended surface: dashboard drawer/flyout, not a separate “card page”.
   - Flows:
     - Upload → classify (optional) → save metadata → link to land parcel
     - List/search/filter by kind (sale deed, RTC/7-12, notice, ID proof)

3. **Persist metadata** using existing REST
   - Create doc row via `POST /api/documents` with `uploadthingKey`, `url`, `mimeType`, `sizeBytes`, `sha256`.

4. **Optional (recommended): document “kind” taxonomy**
   - Keep `kind` as a controlled list (enum-ish) in UI, validated by zod.

### B) Land Parcels UI (finish)

Goal: store a set of parcels and attach documents to each.

1. UI components
   - Create `components\\features\\land\\land-parcels-panel.tsx`
   - Use a drawer to create/edit.

2. API usage
   - List: `GET /api/land-parcels`
   - Create: `POST /api/land-parcels`
   - Update: `PATCH /api/land-parcels/:id`

3. Attach documents
   - On document create/update, set `landParcelId`.

### C) Land record lookup (real)

This is state-specific.

Implementation approach:
1. Add a “lookup provider” abstraction:
   - `lib\\land-records\\providers\\{state}.ts`
   - Normalize output to a shared schema (khata/khasra/mutation/owners/history).

2. Build a **draft-first UX**
   - Farmer enters minimal known values (state/district/tehsil/village + one id)
   - Save draft locally if offline.

3. Caching
   - Use Upstash for caching by query fingerprint (time-bound).

4. Compliance note
   - Many official portals have CAPTCHA/terms; avoid scraping where disallowed.
   - Prefer state open APIs, manual upload of record PDFs, or “assisted mode”.

### D) Scheme eligibility checker

1. Data model
   - Keep scheme catalog in a table or JSON (name, states, eligibility rules, links).

2. Rules engine
   - Start with a simple rules DSL (zod-validated) rather than hardcoding.

3. UX
   - Ask 6–10 questions max; voice-first.

### E) Legal templates (notices/RTI/complaints)

1. Store templates as versioned content
   - `lib\\legal\\templates\\*.md` or DB table with `slug`, `locale`, `body`.

2. Generator
   - Fill placeholders from farmer profile + land parcel + uploaded docs.

3. Safety
   - Always show a plain-language summary + a “check before signing” checklist.

### F) Offline mode

1. Store drafts in IndexedDB
   - Draft documents, partial forms, generated notices.

2. Sync strategy
   - When online, push to REST endpoints; resolve conflicts by timestamp.

---

## 4) Notes on “Highlights” (what it is / what it isn’t)

- Current highlights are **heuristics** (keywords + regex), designed to:
  - surface *where to pay attention*
  - help avoid signing unknown clauses
- It is **not legal advice** and should not claim to be.

Next upgrade path:
- Maintain an explicit list of:
  - Central acts (with common aliases)
  - State acts/amendments grouped by state code
  - Clause taxonomy (jurisdiction/arbitration/indemnity/etc.) with severity
- Add a “tap finding → jump to first match” interaction.
