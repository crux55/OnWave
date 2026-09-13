// Client-side error reporting to our self-hosted GlitchTip instance
// (Sentry-API-compatible) — see project_r#27's error-monitoring follow-up.
// NEXT_PUBLIC_SENTRY_DSN is safe to expose to the browser: a DSN only
// grants permission to submit events, not to read anything back.
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // No DSN configured (e.g. local dev) -> Sentry.init no-ops safely, so this
  // file is harmless to ship even before a DSN exists in an environment.
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
