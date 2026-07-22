import * as Sentry from "@sentry/tanstackstart-react";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  dataCollection: {
    // To disable sending user data and HTTP bodies, uncomment the lines below.
    // userInfo: false,
    // httpBodies: [],
  },

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for tracing.
  tracesSampleRate: 1.0,

  // Enable logs to be sent to Sentry
  enableLogs: true,
});
