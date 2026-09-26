# 17 Launch readiness

**Goal:** the admin is safe to run in production.

## Checklist

- Permission matrix test: every procedure called as owner, editor, support, customer, and signed out gives the expected result.
- E2E suite (Playwright) covering the "Done when" flow of every phase, with screenshots saved as the report.
- Concurrency checks: double stock adjustment, double refund, last coupon use, last owner demotion.
- Production env: separate Neon database, IDrive e2 bucket, Razorpay live keys and webhook secret, Google OAuth client, and exact trusted origins.
- Neon point-in-time restore tested once.
- Secret scan of the repository. `.env` files are not committed.
- VPS: process manager, HTTPS, log rotation, uptime check.
