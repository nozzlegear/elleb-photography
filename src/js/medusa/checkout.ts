import type { FetchError } from "@medusajs/js-sdk";
import type { Sdk } from "./types";

type InitiateCheckoutResponse = {
    id: string;
    url: string;
}

/**
 * Create a Stripe Checkout session and return the checkout URL
 * The user will be redirected to this URL to complete payment
 *
 * This implements a "Stripe Express Checkout" flow where:
 * 1. User clicks checkout button
 * 2. User is redirected to Stripe to enter payment details
 * 3. After payment, user is redirected back to the thank-you page
 */
export async function createStripeCheckoutSession(sdk: Sdk, cartId: string): Promise<string> {
  // Call our custom backend endpoint to create a Stripe Checkout Session
  let checkoutResponse: InitiateCheckoutResponse;

  try {
      checkoutResponse = await sdk.client.fetch<InitiateCheckoutResponse>(`/stripe-checkout`, {
        method: 'POST',
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
        body: {
            cart_id: cartId,
        },
      });
  } catch (e: any) {
    const err: FetchError = e;
    throw new Error(`Failed to create Stripe checkout session: ${err.status} ${err.statusText} - ${err.message}`);
  }

  if (!checkoutResponse.url)
    throw new Error('Checkout session URL not returned from server');

  return checkoutResponse.url;
}

