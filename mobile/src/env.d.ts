// Public build-time variables. Expo inlines `process.env.EXPO_PUBLIC_*` only when read with dot access, so
// each one is declared here rather than read through the index signature.
declare namespace NodeJS {
  interface ProcessEnv {
    /** "1" in builds made for review: allows preview data and the development gate outside __DEV__. */
    EXPO_PUBLIC_PREVIEW_TOOLS?: string;
  }
}
