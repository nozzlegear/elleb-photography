import type { Sdk } from "./types";
import { getMedusaConfig } from "./index";

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
  // Get the Medusa configuration to access baseUrl and publishableKey
  const config = getMedusaConfig();
  if (!config)
    throw new Error('Medusa configuration not available');

  // Call our custom backend endpoint to create a Stripe Checkout Session
  const checkoutResponse = await sdk.client.fetch<Response>(`/stripe-checkout`, {
    method: 'POST',
    headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
    },
    body: JSON.stringify({
        cart_id: cartId,
    }),
  });

  if (!checkoutResponse.ok) {
    const errorText = await checkoutResponse.text();
    throw new Error(`Failed to create Stripe checkout session: ${checkoutResponse.statusText} - ${errorText}`);
  }

  const checkoutData: InitiateCheckoutResponse = await checkoutResponse.json();

  if (!checkoutData.url)
    throw new Error('Checkout session URL not returned from server');

  return checkoutData.url;
}
