# kmercoders.com — Deployment Checklist

Run through this list whenever the canonical domain changes. Mark each item
as complete only after verifying in the relevant provider dashboard.

## 1. Lovable / Hosting
- [ ] Connect `kmercoders.com` and `www.kmercoders.com` in **Project Settings → Domains**
- [ ] Mark `kmercoders.com` as the **Primary** domain
- [ ] Verify SSL has been auto-provisioned (status = Active)
- [ ] Decide whether to keep or remove the legacy `khai.africa` domain

## 2. Lovable Cloud Secrets
- [x] `APP_URL` → `https://kmercoders.com`
- [ ] Confirm no other secret still references the old domain
      (`fetch_secrets` shows names only — values must be checked manually
      in **Connectors → Secrets**)

## 3. Google OAuth (Google Cloud Console → APIs & Services → Credentials)
- [ ] Authorized JavaScript origins: add `https://kmercoders.com`,
      `https://www.kmercoders.com`
- [ ] Authorized redirect URIs: add `https://kmercoders.com`,
      `https://kmercoders.com/auth`, `https://kmercoders.com/google-auth`
- [ ] Remove old `khai.africa` entries once cutover is complete
- [ ] OAuth consent screen → Application home page / Privacy / TOS URLs
      updated to `kmercoders.com`

## 4. Resend (or Lovable Email) — Sender Domain
- [ ] Verify `kmercoders.com` in Resend → Domains
- [ ] Add SPF, DKIM, DMARC, MX DNS records as instructed
- [ ] Test send from `noreply@kmercoders.com`
- [ ] Remove or archive the verified `khai.africa` sender domain

## 5. Flutterwave Dashboard
- [ ] Settings → Webhooks: ensure URL points to
      `https://olofegxhytctncyhsmpy.supabase.co/functions/v1/flutterwave-webhook`
      (Supabase function URL is domain-agnostic — usually no change required)
- [ ] Settings → Redirect URL: update to `https://kmercoders.com/premium`
- [ ] Brand display name / business URL → `kmercoders.com`

## 6. Stripe Dashboard
- [ ] Developers → Webhooks: confirm endpoint
      `https://olofegxhytctncyhsmpy.supabase.co/functions/v1/stripe-webhook`
- [ ] Settings → Branding / Business website → `https://kmercoders.com`
- [ ] Customer Portal → return URL → `https://kmercoders.com/settings`
- [ ] Checkout success/cancel URLs in `create-checkout` function reference
      env-driven origin (no hard-coded khai.africa)

## 7. CORS / Allowed Origins
- [ ] Edge functions use `Access-Control-Allow-Origin: *` — no per-domain
      change needed, but if you tighten this, allowlist must include
      `https://kmercoders.com` and `https://www.kmercoders.com`
- [ ] Supabase Auth → URL Configuration → Site URL = `https://kmercoders.com`
- [ ] Supabase Auth → Redirect URLs: add `https://kmercoders.com/**`

## 8. Pusher / Realtime
- [ ] Pusher dashboard → App settings → Allowed origins → add
      `https://kmercoders.com`

## 9. PWA / Manifest
- [ ] After publish, hit `https://kmercoders.com/manifest.webmanifest` and
      confirm `start_url` and `scope` resolve to the new domain
- [ ] Open DevTools → Application → Service Workers and unregister the
      stale `khai.africa` worker on test devices

## 10. Verification Pass
- [ ] Run `bun run scripts/check-legacy-strings.ts` (CI also runs this)
- [ ] Hit `POST /functions/v1/webhook-config-check` and confirm all
      providers report `ok`
- [ ] Smoke test: signup → verification email → login → premium upgrade
      → image gen → conversation persistence