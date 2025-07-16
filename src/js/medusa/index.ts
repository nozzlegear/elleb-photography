import Medusa from "@medusajs/js-sdk"

type MedusaConfig = {
  backendUrl: string
  publishableKey: string
  debug: boolean
}

const medusaConfigStr: string? = document.getElementById("medusaConfig")?.innerText;

if (!medusaConfigStr) {
    console.warning("#medusaConfig does not exist, script will not attempt to load Medusa products on this page.");
    return;
}

const medusaConfig: MedusaConfig = JSON.parse(medusaConfigStr)

export const sdk = new Medusa({
    baseUrl: medusaConfigStr.backendUrl,
    debug: medusaConfigStr.debug,
    publishableKey: medusaConfigStr.publishableKey,
})
