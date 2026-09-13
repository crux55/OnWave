// Server/edge-side error reporting to our self-hosted GlitchTip instance —
// see instrumentation-client.ts for the browser-side counterpart.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const Sentry = await import('@sentry/nextjs');
    Sentry.init({
      dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 0.1,
      environment: process.env.NODE_ENV,
    });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    const Sentry = await import('@sentry/nextjs');
    Sentry.init({
      dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 0.1,
      environment: process.env.NODE_ENV,
    });
  }
}

export async function onRequestError(...args: Parameters<typeof import('@sentry/nextjs').captureRequestError>) {
  const Sentry = await import('@sentry/nextjs');
  Sentry.captureRequestError(...args);
}
