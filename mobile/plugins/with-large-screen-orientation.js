const { AndroidConfig, withAndroidManifest } = require("expo/config-plugins");

const PROPERTY = "android.window.PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY";

/**
 * Android 16 ignores orientation locks on large screens (smallest width 600dp or more) for apps
 * targeting API 36. This declares Google's documented opt-out so the field map can still hold a
 * tablet in landscape. It stops applying once the app targets API 37; see ../README.md.
 */
module.exports = function withLargeScreenOrientation(config) {
  return withAndroidManifest(config, (manifestConfig) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(manifestConfig.modResults);
    application.property = [
      ...(application.property ?? []).filter((entry) => entry.$["android:name"] !== PROPERTY),
      { $: { "android:name": PROPERTY, "android:value": "true" } },
    ];
    return manifestConfig;
  });
};
