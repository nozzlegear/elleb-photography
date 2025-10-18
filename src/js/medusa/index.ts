import Medusa from "@medusajs/js-sdk"
import type { Sdk } from "./types";

function isUndefined(value: string | undefined): value is undefined {
  return value === undefined || typeof value === "undefined";
}

function parseBool(s: string): boolean {
  return s.trim().toLowerCase() === "true";
}

function getMetaConfigValue(metaElementName: string): string | undefined {
  const selector = `meta[name="${metaElementName}"]`;
  const medusaConfigStr = document.querySelector<HTMLMetaElement>(selector)?.content ?? null;

  if (!medusaConfigStr) {
    console.warn(`${selector} does not exist`);
    return;
  }

  return medusaConfigStr;
}

export type MedusaConfig = {
  baseUrl: string;
  publishableKey: string;
  debug: boolean;
};

let cachedConfig: MedusaConfig | undefined;

export function getMedusaConfig(): MedusaConfig | undefined {
  if (cachedConfig) {
    return cachedConfig;
  }

  const baseUrl = getMetaConfigValue("medusa-base-url");
  const publicKey = getMetaConfigValue("medusa-public-key");
  const debugMode = getMetaConfigValue("medusa-debug-mode");

  if (isUndefined(baseUrl) || isUndefined(publicKey) || isUndefined(debugMode)) {
    console.warn(`Script will not attempt to load Medusa products on this page.`)
    return;
  }

  cachedConfig = {
    baseUrl,
    publishableKey: publicKey,
    debug: parseBool(debugMode),
  };

  return cachedConfig;
}

export function configureSdk(): Sdk | undefined {
  const config = getMedusaConfig();

  if (!config) {
    return;
  }

  return new Medusa(config);
}
