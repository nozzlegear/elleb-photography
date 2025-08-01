import Medusa from "@medusajs/js-sdk"
import type { Sdk } from "./types";

function isUndefined(value: string | undefined): value is undefined {
  return value === undefined || typeof value === "undefined";
}

function getMetaConfigValue(metaElementName: string): string | undefined {
  const selector = `meta[name=${metaElementName}]`
  const medusaConfigStr = document.querySelector<HTMLMetaElement>(metaElementName)?.content ?? null;

  if (!medusaConfigStr) {
    console.warn(`${selector} does not exist`);
    return;
  }

  return medusaConfigStr;
}

export function configureSdk(): Sdk {
  const baseUrl = getMetaConfigValue("medusa-base-url");
  const publicKey = getMetaConfigValue("medusa-public-key");
  const debugMode = getMetaConfigValue("medusa-debug-mode");

  if (isUndefined(baseUrl) || isUndefined(publicKey) || isUndefined(debugMode)) {
    console.warn(`Script will not attempt to load Medusa products on this page.`)
    return;
  }

  return new Medusa({
      baseUrl: baseUrl,
      debug: Boolean(debugMode),
      publishableKey: publicKey,
  })
}
