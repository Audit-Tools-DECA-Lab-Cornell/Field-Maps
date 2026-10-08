import * as Linking from "expo-linking";
import { announce } from "../../ui";

/** The privacy information, on the deployed web workspace (Org 16). One page for both apps. */
export const PRIVACY_URL = "https://field-maps.vercel.app/privacy";

/** Opens the privacy information in the browser. Says where it lives if the browser cannot open. */
export function openPrivacy(): void {
  Linking.openURL(PRIVACY_URL).catch(() => {
    announce(
      "The privacy information could not open here. It is at field-maps.vercel.app/privacy.",
    );
  });
}
