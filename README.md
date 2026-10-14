# Bin Rush ♻️

A 60-second daily game that teaches household waste segregation. Items fall one at a time and you segregate each into the right bin before it lands: **Wet**, **Dry** or **Hazardous**, following India's three-stream household rules.

Everyone gets the same 20 items each day, so the daily leaderboard is fair. Every mistake comes with a one-line explanation, so you get better by playing.

**Stack:** Next.js (App Router, TypeScript) · Tailwind CSS · Clerk (auth) · Supabase Postgres (data) · Vitest (tests).

## How the game works

- **One scored round per day.** 60 seconds, 20 items, 3 bins. Items fall faster as the round goes on.
- **Practice is unlimited.** A quick warm-up of 3 to 5 random items, at least one for each bin. It works without an account and earns nothing.
- **Controls.** Tap a bin, swipe the item (left = Wet, down = Dry, right = Hazardous), or use the keyboard (`←` `↓` `→` or `1` `2` `3`).
- **Scoring.** A correct item earns 100 points plus a speed bonus of up to 50. Combos multiply points (×1.5 after 5 in a row, ×2 after 10). A wrong bin costs 50 points and resets the combo, so accuracy beats speed.
- **Mystery guest.** One tricky "boss" item hides in each daily set and is worth an extra 300 points.
- **Progress.** Daily streaks, XP and levels (Litter Picker → Zero-Waste Legend), seven badges, and 0 to 3 stars per round.
- **Learning.** On the results screen, the bin buddies explain every item you got wrong.

## Setup

You need Node.js and npm, a free [Clerk](https://clerk.com) account and a free [Supabase](https://supabase.com) project.

1. **Clone the repo**
   ```bash
   git clone https://github.com/your-username/bin-rush.git
   cd bin-rush
   ```
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Set up Clerk.** Create an application at https://dashboard.clerk.com.
   - Enable **Email** (required) and optionally **Google** sign-in.
   - Under *User & authentication → Username*, turn **Username** on and make it **required**. It is the name shown on the leaderboard.
4. **Set up Supabase.** Create a project, open the **SQL Editor** and run `supabase/schema.sql`.
5. **Add your keys.** Copy the template and fill it in:
   ```bash
   cp .env.example .env.local
   ```

   | Variable | Where to find it |
   | --- | --- |
   | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk dashboard → API keys |
   | `CLERK_SECRET_KEY` | Clerk dashboard → API keys |
   | `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Leave as `/sign-in` |
   | `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Leave as `/sign-up` |
   | `SUPABASE_URL` | Supabase → Project settings → API |
   | `SUPABASE_SECRET_KEY` | Supabase → Project settings → API keys → secret key (or the older `service_role` key) |

   The Supabase secret key is server-only. Never give it a `NEXT_PUBLIC_` prefix, and never commit `.env.local`.
6. **Run it**
   ```bash
   npm run dev     # http://localhost:3000
   ```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm test` | Run the unit tests for the game logic |
| `npm run lint` | Run ESLint |
| `npm run build` | Make a production build |
| `npm start` | Serve the production build |

## How it fits together

- **Shared game logic.** `src/lib/game/` is used by both the browser and the server. It holds the item pool (`items.json`), the date-seeded daily set, scoring, answer validation, and the streak, XP, level, badge and star rules.
- **Fair scoring.** The browser plays the round and sends **only answers and timings**. `POST /api/round/submit` rebuilds the day's set from the date, checks the timings and recomputes the score before saving it.
- **One round per day.** `POST /api/round/start` claims the day before play begins, using a unique `(user_id, date)` row. A refresh or an abandoned round still uses up the day.
- **Users.** Clerk handles sign-in. The server copies each user's Clerk ID, email and username into the `users` table on `/api/me` and `/api/round/start`. No webhooks are needed.
- **Access.** `src/proxy.ts` (Next.js 16's name for middleware) sends signed-out visitors away from `/play` and `/profile`. API routes check the session themselves.

| Route | Access |
| --- | --- |
| `/` Home, `/practice`, `/leaderboard`, `/sign-in`, `/sign-up` | Public |
| `/play`, `/profile` | Signed in |
| `GET /api/leaderboard` | Public (adds your own rank when signed in) |
| `GET /api/me`, `POST /api/round/start`, `POST /api/round/submit` | Signed in |

## Project structure

```
src/
  app/              pages and API routes
  components/       Game, Results, BinBuddy characters and shared UI
  lib/game/         shared game logic and unit tests
  lib/server/       Supabase client, Clerk user sync, API helpers
  lib/client/       browser helpers (API calls, today's date, bin labels)
  proxy.ts          Clerk route protection
supabase/schema.sql database tables
```
