import type { Sdk } from "./types";

/**
 * Digital product information returned by the storefront API
 */
export type DigitalProductInfo = {
    product_id: string;
    has_digital_version: boolean;
    digital_price: number | null; // Price in cents
    digital_file_count: number;
};

/**
 * Fetches digital product information from the backend.
 * Returns null if the product doesn't have digital version metadata.
 */
export async function fetchDigitalProductInfo(sdk: Sdk, productId: string): Promise<DigitalProductInfo | null> {
    try {
        const response = await sdk.client.fetch<DigitalProductInfo>(
            `/store/custom/digital-products/${productId}`,
            { method: "GET" }
        );
        return response;
    } catch (error) {
        console.error(`Failed to fetch digital product info for ${productId}:`, error);
        return null;
    }
}

/**
 * Fetches digital product information for multiple products in parallel.
 * Returns a Map of productId → DigitalProductInfo for products that have digital versions.
 */
export async function fetchDigitalProductInfoBatch(
    sdk: Sdk,
    productIds: string[]
): Promise<Map<string, DigitalProductInfo>> {
    const results = await Promise.all(
        productIds.map(async (productId) => {
            const info = await fetchDigitalProductInfo(sdk, productId);
            return { productId, info };
        })
    );

    const map = new Map<string, DigitalProductInfo>();
    for (const { productId, info } of results) {
        if (info && info.has_digital_version) {
            map.set(productId, info);
        }
    }

    return map;
}
