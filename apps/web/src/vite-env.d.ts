/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_WS_URL: string;
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_URL: string;
  readonly VITE_ENABLE_2FA: string;
  readonly VITE_ENABLE_SOCIAL_LOGIN: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_CAPTCHA_SITE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
