# License Key Admin (demo)

An admin dashboard for issuing and managing software license keys, plus a public page where a customer moves a license to a new machine (an "HWID reset") without contacting the seller.

This repository runs **with zero external services**: by default it uses an in-memory mock backend seeded with fake data. The same code can proxy to a real license API when you point it at one.

The UI text is in Thai. A Thai README is in [README.th.md](README.th.md).

## Quick start

```bash
npm ci
npm run dev
```

Open http://localhost:3000 and sign in with the password `demo1234`. No `.env` file is needed.

Demo data lives in the server process memory and **resets on every restart**. A "Demo data" badge in the corner of every page says so.

## Pages

| URL | Who | What |
|---|---|---|
| `/login` | anyone | admin password form |
| `/dashboard` | admin | key counts and the keys expiring within 7 days, with a renew button |
| `/keys` | admin | all keys: search, create, renew, revoke, release the machine binding |
| `/create` | admin | create a key and copy a ready-made message for the customer |
| `/reset` | anyone | customer self-service: enter a key, release the machine binding |

## Architecture

```
browser ──► Next.js route handlers (BFF) ──► mock store (demo)  or  real license API
            /api/admin/*   needs session        in-memory           LICENSE_API_URL + ADMIN_SECRET
            /api/public/*  no session, no secret
            /api/auth/*    login / logout
```

- **Route handlers as a backend-for-frontend.** The browser never talks to the license API. `ADMIN_SECRET` is read only inside `app/api/admin/*` on the server, so it never reaches client code. The customer-facing `/api/public/reset-hwid` carries no secret at all, because attaching one would let every visitor bypass the per-day reset limit.
- **Signed session cookie** (`lib/session.ts`): `<expiry>.<HMAC-SHA256>` using Web Crypto, `HttpOnly`, `SameSite=Lax`, `Secure` in production, 12 hour lifetime, constant-time signature compare. Login adds a fixed delay on a wrong password.
- **Deny-by-default gate** (`proxy.ts`): only the paths listed as public (`/login`, `/reset`, `/api/public/*`, the auth routes) are open. Any other path, including pages added later, needs a valid session. Admin API calls without a session get a JSON `401`; pages get a redirect to `/login`.
- **Client/server split in `app/lib/`:** `admin-api.ts` calls `/api/admin/*`, `customer-api.ts` calls `/api/public/*` only, `types.ts` is shared.

### Demo mode vs real mode

The mode is decided by one variable, `LICENSE_API_URL` (`lib/demo.ts`).

| | Demo (default, `LICENSE_API_URL` unset) | Real (`LICENSE_API_URL` set) |
|---|---|---|
| Data | `app/lib/mock-store.ts`, in memory, 10 seeded fake keys | proxied to the license API with the `x-admin-secret` header |
| Login password | `ADMIN_PASSWORD`, or `demo1234` if unset | `ADMIN_PASSWORD` required (8+ chars), else login returns 500 |
| Session secret | `SESSION_SECRET`, or a built-in demo value if unset | `SESSION_SECRET` required (16+ chars), else no session can be created |
| `ADMIN_SECRET` | not used | required, else admin routes return 500 |

In real mode there is no fallback to demo values (checked, see Tests).

The mock implements list, create, extend, revoke, admin reset and public reset. For the public reset it enforces: the key must exist for the chosen system, not be revoked or expired and must currently be bound to a machine; one reset per Bangkok calendar day; at most 5 resets in 30 days. Several seeded keys exist to show each outcome (already reset today, quota used up, revoked, expired, never activated).

## Environment variables

| Variable | Needed | Purpose |
|---|---|---|
| `LICENSE_API_URL` | real mode only | base URL of the license API. Unset = demo mode |
| `ADMIN_SECRET` | real mode | sent to the license API as `x-admin-secret`; server side only |
| `ADMIN_PASSWORD` | real mode (optional in demo) | admin login password, 8+ characters |
| `SESSION_SECRET` | real mode (optional in demo) | signs the session cookie, 16+ characters. Changing it signs everyone out |

`.env.example` lists them.

## Tests

```bash
npm test               # unit tests for the mock store (node:test, Node 24+)
npx tsc --noEmit       # type check
npm run lint
npm run test:e2e       # Playwright: login gate, cookie tampering (needs browsers installed)
```

The unit tests cover create then list, revoke, extend (extended / restarted / not started), the public reset rejecting unknown, wrong-system, revoked, expired and unbound keys, the once-per-day limit and the 30-day quota. The Playwright suite starts its own dev server on port 3000 with test credentials.

## Known limitations

- The mock is not the real backend. Its error messages, reset quota and edge cases are this project's own approximation.
- Demo state is per process. On a serverless host with several instances, each instance would show different data.
- The demo password and demo session secret are public (they are in this repository). Do not expose a demo-mode instance as if it were protected, and do not set `LICENSE_API_URL` without also setting your own `ADMIN_PASSWORD` and `SESSION_SECRET`.
- Login throttling is only a fixed delay per attempt; there is no per-IP rate limit or lockout.
- The public reset route has no rate limit of its own in this repo; in real mode it relies on the backend's limits.
- The two product types were renamed to `SORTER` and `CAPTCHA` for this demo. A real backend that expects other values would need a mapping.
- `npm audit` reports advisories in transitive dependencies; versions were left as they were.
- No audit log and no persistence in demo mode.

## License

MIT, see [LICENSE](LICENSE).
