/**
 * The theme constants the server needs. Kept out of `lib/theme.ts`, which is a client module: a server
 * component that imports from a "use client" file receives client references, not these values.
 */

/** Where this browser keeps the reader's screen theme. Day unless they chose Dusk. */
export const THEME_STORAGE_KEY = "fm-theme";

/**
 * Runs in <head> before first paint, so a Dusk reader never sees a Day flash. It also records the
 * platform, which decides whether shortcut hints read ⌘K or Ctrl K without a hydration mismatch.
 */
export const THEME_SCRIPT = `(function(){try{var d=document.documentElement;var t=null;try{t=localStorage.getItem("${THEME_STORAGE_KEY}")}catch(e){}var v=t==="dusk"?"dusk":"day";d.setAttribute("data-theme",v);d.style.colorScheme=v==="dusk"?"dark":"light";var p=(navigator.userAgentData&&navigator.userAgentData.platform)||navigator.platform||navigator.userAgent||"";d.setAttribute("data-platform",/mac|iphone|ipad/i.test(p)?"mac":"other")}catch(e){}})();`;
