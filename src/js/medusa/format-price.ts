import type { StoreProductVariant } from "@medusajs/types";

/**
 * Formats the given amount, or the amount of the given price set, using the browser's `Intl.NumberFormat` function.
 */
export function formatPrice(amount: number, currency_code: string): string;
export function formatPrice(priceSet: StoreProductVariant["calculated_price"], type: "subtotal" | "total"): string;
export function formatPrice(input: StoreProductVariant["calculated_price"] | number, typeOrCurrency: string | "subtotal" | "total"): string {
    let amount: number;
    let currency: string;

    if (!input) {
        amount = 0;
        currency = typeOrCurrency;
    } else if (typeof input === "number") {
        amount = input;
        currency = typeOrCurrency;
    } else {
        amount = typeOrCurrency === "total" ? input.calculated_amount_with_tax! : input.calculated_amount_without_tax!;
        currency = input.currency_code ?? "USD";
    }

    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency,
    })
        .format(amount);
}

