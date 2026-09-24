# Together: group trip planner

Create a trip, share its unique group link, and let any number of friends join. Every member receives a private edit link. Once everyone has submitted, the organiser can request a recommendation round, the group can vote, and the organiser can lock a choice. Previous rounds remain stored.

## Stack

- Next.js 16 and TypeScript
- Supabase PostgREST for persistent trips, members, rounds, options, and votes
- Gemini 3.5 Flash-Lite free tier with structured JSON for destination candidates and short explanations
- SerpApi Google Flights and Hotels APIs for live estimates (free plan)

All keys stay in server environment variables. The public group link lets anyone join and see names, response progress, options, and vote totals. A member's private fragment link is required to edit their response or vote. The organiser's private fragment link is required to generate rounds and lock a choice. Keep private links out of public channels.

## Set up

1. Create a Supabase project and run [`supabase/schema.sql`](supabase/schema.sql) in its SQL editor.
2. Set the variables listed in [`.env.example`](.env.example) locally and in Vercel project settings. Use a new `sb_secret_` Supabase key if possible. The legacy service role key also works through `SUPABASE_SERVICE_ROLE_KEY`.
3. Add a free SerpApi API key as `SERPAPI_API_KEY`. The free plan includes 250 searches per month; each destination uses one hotel search plus one round-trip flight search per distinct origin, up to three destinations per round. No payment method is needed for the free plan. Use a Gemini API key on its free tier.
4. Run `npm ci`, `npm test`, `npm run typecheck`, and `npm run build`.
5. Deploy with `vercel --prod` after linking the Vercel project and setting the runtime variables. Verify a multi-member flow on the resulting URL.

No fake prices are used. A round reports a date conflict, unavailable offer, or provider error when it cannot verify a candidate. Budget checks use one round-trip flight per person plus an equal share of the quoted hotel total. Destination type influences compatibility; dates, per-person budget, and explicitly excluded destinations are enforced in code. Other free-text dealbreakers inform Gemini's suggestions and should be checked by the group before booking. Provider links open comparison searches, whose prices may differ from the stored quote.

## Form 2

- One-page component map: [`artifacts/form-2-component-map.png`](artifacts/form-2-component-map.png)
- Editable source: [`artifacts/form-2-component-map.svg`](artifacts/form-2-component-map.svg)
- Exact first Claude Code prompt: [`artifacts/form-2-first-claude-code-prompt.txt`](artifacts/form-2-first-claude-code-prompt.txt)

The Form 2 prompt retains the original five-person wording as requested. The implemented app follows the later requirement: anyone with the unique link can join.
