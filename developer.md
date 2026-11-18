# developer.md

Working notes for QuickChat v2: audit, decisions, setup, deployment, known issues and progress.

## 1. Audit of the original project (v1)

**What it was meant to be:** a real-time chat app (React + Express + MongoDB + Socket.IO + Cloudinary) with signup/login, a contact sidebar with unread badges, 1:1 text/image messaging, online presence and profile editing.

**What worked:** the happy path, if you had a MongoDB Atlas URI and a Cloudinary account. JWT auth, message persistence, online list and image upload were all wired up.

**What was broken or missing**

| Area | Problem |
|---|---|
| Security | Login response returned the **bcrypt hash** (`userData` was the raw doc). Login crashed (500) for unknown emails (`userData.password` on `null`). Socket identity came from an unauthenticated `?userId=` query, so anyone could impersonate anyone. JWTs never expired. `markMessageAsSeen` had no ownership check. No rate limiting, no input validation, no CORS config beyond a hard-coded list. |
| Correctness | Every error returned HTTP 200 with `success:false`; `getMessages` returned `success:true` on error. One socket per user (second tab kicked the first out of the map). `formatMessageTime` used `hour12: "false"` (a string). `toast` used but never imported in `ChatContainer`. React `key={index}`. `handleSendImage` crashed when no file was chosen. Sidebar refetched on every presence change. N+1 query for unseen counts. `grid-cols-[1fr_2fr_fr]` typo. |
| Product | No typing indicator, reactions, last-message preview, ordering by recency, or read receipts. No empty/loading/error states. No optimistic send or retry. Layout broke on small screens. |
| Setup | Impossible to run without MongoDB + Cloudinary accounts. README referred to `backend/` and `frontend/` folders and a `MONGO_URI` var that did not match the code (`MONGODB_URI`). Unused dummy assets and imports. No tests, no TypeScript, `client/` code in an odd `context/` folder outside `src`. |
| Structure | Server `export const io` imported back from controllers (circular). Logic and I/O mixed in controllers. |

## 2. Research (what the best chat products do well)

Sources: WhatsApp's [Message Summaries announcement](https://blog.whatsapp.com/catch-up-on-conversations-with-private-message-summaries), third-party WhatsApp summarizer extensions, PubNub's [typing-indicator guide](https://www.pubnub.com/guides/how-a-typing-indicator-enables-chat-engagement/), the Slack / Discord / Telegram interaction patterns (typing, reactions), the Element/Matrix, Mattermost and Rocket.Chat comparison pages, and the [vibrant.design](https://vibrant.design/) gallery. Note: the web search was shallow and vibrant.design's fetch returned structure only (no CSS), so palette choices below are my own interpretation of "vibrant, minimal chrome, media-forward".

Takeaways applied:
1. **Presence of life**: typing indicators, online dots and read receipts make chat feel real-time (PubNub, Slack, Telegram).
2. **Reactions** are a lightweight reply and a staple of Slack/Discord/Telegram.
3. **AI that saves keystrokes**: WhatsApp's unread summaries and Gmail-style smart replies. Summaries and quick replies are where AI adds value without being a gimmick.
4. **Self-hostable and zero-friction**: Element, Mattermost and Rocket.Chat win on being runnable on your own infrastructure. I made the app runnable with *no* external accounts.
5. **Vibrant design**: bold type, saturated gradients on a dark canvas, pill buttons, generous radii, minimal chrome that lets content lead.

## 3. Decisions

- **Branch**: the task asked for `claude/revamp-v2`; the session environment is restricted to `claude/revamp-v2-nyr6lf`, so all work and the PR use that branch. Never pushed to `main`.
- **Stack**: kept React + Vite + Tailwind + Express + Socket.IO + MongoDB, migrated both halves to **TypeScript** (shared mental model, typed API contract, catches bugs like the ones in the audit). Did *not* move to Next.js: the app is a client-rendered, socket-driven SPA with a separate long-lived Socket.IO server, so SSR adds cost without benefit.
- **npm workspaces monorepo** (`server/`, `client/`) with one `npm run dev`.
- **State**: React Context → **Zustand** stores. Fewer re-renders, no provider nesting, store logic testable without React; pure reducers live in `chatLogic.ts`.
- **Persistence abstraction** (`Store` interface): `MemoryStore` (default, seeded) and `MongoStore`. With no `MONGODB_URI` the app runs fully in demo mode. If Mongo is configured but unreachable, the server logs it and falls back to memory instead of crashing.
- **Media abstraction**: Cloudinary if configured, else images stay inline as validated data URLs (type allow-list + 3 MB cap).
- **AI abstraction** (`AIProvider`): Gemini, Groq (raw `fetch`, no SDKs) and `MockProvider`. `AIService` owns prompts and **falls back to offline heuristics on any provider error/timeout/garbage output**, so AI features never hard-fail. `AI_PROVIDER=auto` picks Gemini → Groq → mock.
- **Bot contacts** (Quick AI, Alison, Marco, Enrique) are real users flagged `isBot` with a persona prompt, so a fresh install is never an empty room and the AI is demonstrable solo. Bots cannot log in and are always shown online.
- **Auth**: HTTP status codes now mean something, 7-day JWT, same error for unknown email vs wrong password, socket handshake authenticated with the JWT.
- **Design**: dark-only (light theme deferred), Bricolage Grotesque + Inter, aurora gradient backdrop, glass panels.
- **Message history** is capped to the last 200 messages per conversation (pagination is on the roadmap).

## 4. Setup

```bash
git clone <repo> && cd Quick-Chat
npm install
npm run dev          # API on :5000, web on :5173
```
Open http://localhost:5173 and click **Try the demo account** (`demo@quickchat.dev` / `demo1234`, memory mode only), or sign up.

Other scripts: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.

### Environment variables (all optional)

Copy `server/.env.example` to `server/.env`. Never commit it.

| Var | Where | Purpose | Get it |
|---|---|---|---|
| `PORT` | server | API port (default 5000) | n/a |
| `CLIENT_ORIGINS` | server | comma-separated allowed web origins (CORS + sockets) | your deployed web URL |
| `JWT_SECRET` | server | signs tokens; **required in production** | `openssl rand -hex 32` |
| `MONGODB_URI` | server | persistence; empty = in-memory | free MongoDB Atlas M0 cluster |
| `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET` | server | image hosting; empty = inline images | free Cloudinary account |
| `AI_PROVIDER` | server | `auto` \| `gemini` \| `groq` \| `mock` | n/a |
| `GEMINI_API_KEY` (+ `GEMINI_MODEL`) | server | Gemini | https://aistudio.google.com/apikey (free tier) |
| `GROQ_API_KEY` (+ `GROQ_MODEL`) | server | Groq | https://console.groq.com/keys (free tier) |
| `VITE_BACKEND_URL` | client | API origin in production; empty in dev (Vite proxy) | your deployed API URL |

`GET /api/health` reports which modes are active (`store`, `media`, `ai`).

## 5. Deploying on free tiers

The server needs a long-lived Node process for WebSockets, so the old Vercel-serverless setup for the API cannot hold Socket.IO connections reliably.
1. **Database**: MongoDB Atlas M0, allow `0.0.0.0/0` (or Render's outbound IPs), copy the URI.
2. **API** on [Render](https://render.com) (free web service): root `server`, build `npm install && npm run build`, start `npm start`. Set `NODE_ENV=production`, `JWT_SECRET`, `MONGODB_URI`, `CLIENT_ORIGINS=<web url>`, optional Cloudinary / AI keys. (Free instances sleep when idle; first request is slow.)
3. **Web** on Vercel/Netlify/Cloudflare Pages: root `client`, build `npm run build`, output `dist`, env `VITE_BACKEND_URL=<api url>`. `client/vercel.json` already contains the SPA rewrite.
   Because the repo is a workspace, set the install command to `npm install` at the repo root if the host does not do so automatically.

## 6. Known issues / limitations

- In-memory mode loses data on restart (by design for demos). Mongo mode seeds the four bot contacts on first start.
- Every registered user sees every other user (no friend/contact model, like v1).
- Inline-image mode stores base64 in the DB; use Cloudinary for anything beyond a demo.
- No message edit/delete, group chats, pagination or push notifications yet.
- `MongoStore` is covered by type checking but not by automated tests (no Mongo available in the build sandbox); the API tests run against `MemoryStore` through the same interface.
- Rate limits are per-process (fine for one free instance).
- Dark theme only.

## 7. Blockers & workarounds

- **vibrant.design styling not extractable**: the fetch tool returned only a markdown conversion (no CSS). Workaround: used its structural vibe (minimal chrome, vivid media-forward) as inspiration. *Nothing needed from you.*
- **Web research depth**: searches returned only general results for UX comparisons; conclusions in section 2 are limited to what was sourced plus well-known product behaviour.
- **MongoDB / Cloudinary / live LLM not exercised in the sandbox**: no credentials for Mongo/Cloudinary, so those paths are untested end to end. *You*: add the keys, run `npm run dev`, and check `/api/health` shows `store: mongo`. (A `GEMINI_API_KEY` was present in the build environment, so the server picked Gemini in a smoke start; screenshots and tests were made with `AI_PROVIDER=mock` for determinism. The Gemini call itself was not verified by an automated test.)

## 8. Progress

**Done**
- Audit, research, decisions
- Server rewrite in TS (stores, AI, media, realtime, bots, validation, rate limiting) + 23 tests
- Client rewrite in TS (stores, UI, AI composer tools, reactions, typing, receipts, states) + 14 tests
- Screenshots, README, CHANGES.md

**In progress**: nothing

**Next** (see roadmap in README): pagination, message edit/delete, group chats, PWA/push, light theme, Mongo integration tests.
