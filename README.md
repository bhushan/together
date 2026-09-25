# Together: group trip planner

Create a trip, share its unique group link, and let any number of friends join. Every member receives a private edit link. Once everyone has submitted, the organiser can request a recommendation round, the group can vote, and the organiser can lock a choice. Previous rounds remain stored.

Live app: [together-bhushan.vercel.app](https://together-bhushan.vercel.app). The previous trip-planner URL redirects here and preserves trip paths.

## Stack

- Next.js 16 and TypeScript
- Supabase PostgREST for persistent trips, members, rounds, options, and votes
- Gemini 3.5 Flash-Lite free tier with structured JSON for destination candidates and short explanations
- SerpApi Google Flights and Hotels APIs for live estimates (free plan)
- GSAP for the hero sequence and for the motion that answers an action
- Fraunces and Instrument Sans, self-hosted through `next/font`

All keys stay in server environment variables. The public group link lets anyone join and see names, response progress, options, and vote totals. A member's private fragment link is required to edit their response or vote. The organiser's private fragment link is required to generate rounds and lock a choice. Keep private links out of public channels.

## Design

The palette is close to monochrome on purpose: deep teal ink (`#0c1e22`) on pale sage (`#e7ebe7`), with aged brass (`#b8893b`) as the only saturated colour in the interface. Everything that carries real colour is either a photograph or a generated horizon, so the chrome never competes with the places it is describing. Tokens live at the top of [`src/app/styles.css`](src/app/styles.css).

Fraunces sets anything display-sized and Instrument Sans does the working text, forms and figures. Both are self-hosted by `next/font`, so there is no render-blocking stylesheet from a font host and no layout shift when they land.

### Motion

There is one orchestrated entrance, on the home hero, plus a slow parallax as it scrolls away. Everything else moves only in answer to something a person did: the readiness meter fills when someone answers, options are dealt out when a round is generated, and the brass marker sweeps across the winner when the organiser locks a choice.

No entry state is set in CSS. Animations are written as GSAP `from` tweens applied before paint, so a visitor with JavaScript off, or with reduced motion on, sees the finished layout rather than a page waiting for an entrance that never arrives. `useMotion` in [`src/lib/motion.ts`](src/lib/motion.ts) scopes every tween to a `gsap.context` and reverts it on cleanup.

### Imagery

Two photographs ship with the app, in [`src/assets/img`](src/assets/img). They are imported rather than served from `public/`, so they are content-hashed, immutable-cached, and re-encoded to AVIF or WebP by the Next image optimiser at the size each viewport needs. Only the home hero is preloaded; it is the LCP element. Both carry a build-time blur placeholder, and both sit in fixed-ratio boxes so nothing shifts as they load. Source: Unsplash (Lago di Braies, and layered ridges), used under the Unsplash License.

Destinations are generated at runtime, so there is no photograph that can honestly be attached to one. Each option instead gets a horizon drawn from its own name: [`src/lib/motif.ts`](src/lib/motif.ts) hashes the destination into a palette scheme, a waterline, a sun and a set of ridges, and [`src/components/horizon.tsx`](src/components/horizon.tsx) renders it as inline SVG. The same place always looks the same, nothing is fetched, and no destination is ever illustrated with a picture of somewhere else.

## Set up

1. Create a Supabase project and run [`supabase/schema.sql`](supabase/schema.sql) in its SQL editor.
2. Set the variables listed in [`.env.example`](.env.example) locally and in Vercel project settings. Use a new `sb_secret_` Supabase key if possible. The legacy service role key also works through `SUPABASE_SERVICE_ROLE_KEY`.
3. Add a free SerpApi API key as `SERPAPI_API_KEY`. The free plan includes 250 searches per month; each destination uses one hotel search plus one round-trip flight search per distinct origin, up to three destinations per round. No payment method is needed for the free plan. Use a Gemini API key on its free tier.
4. Run `npm ci`, `npm test`, `npm run typecheck`, and `npm run build`.
5. Deploy with `vercel --prod` after linking the Vercel project and setting the runtime variables. Verify a multi-member flow on the resulting URL.

For this deployment, Supabase is connected and the schema is applied. The Vercel project is `together`. If a SerpApi request returns HTTP 401, replace `SERPAPI_API_KEY` with the value from the [SerpApi API key page](https://serpapi.com/manage-api-key) and redeploy; Vercel does not apply changed environment variables to an existing deployment.

No fake prices are used. A round reports a date conflict, unavailable offer, or provider error when it cannot verify a candidate. Budget checks use one round-trip flight per person plus an equal share of the quoted hotel total. Destination type influences compatibility; dates, per-person budget, and explicitly excluded destinations are enforced in code. Other free-text dealbreakers inform Gemini's suggestions and should be checked by the group before booking. Provider links open comparison searches, whose prices may differ from the stored quote.

## Form 2

- One-page component map: [`artifacts/form-2-component-map.png`](artifacts/form-2-component-map.png)
- Editable source: [`artifacts/form-2-component-map.svg`](artifacts/form-2-component-map.svg)
- Exact first Claude Code prompt: [`artifacts/form-2-first-claude-code-prompt.txt`](artifacts/form-2-first-claude-code-prompt.txt)

The Form 2 prompt retains the original five-person wording as requested. The implemented app follows the later requirement: anyone with the unique link can join.
