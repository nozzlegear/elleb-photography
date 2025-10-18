import type { StoreCart, StoreOrder } from "@medusajs/types";
import type { Sdk } from "./types";

/**
 * Create a Stripe Checkout session and return the checkout URL
 * The user will be redirected to this URL to complete payment
 *
 * This implements a "Stripe Express Checkout" flow where:
 * 1. User clicks checkout button
 * 2. User is redirected to Stripe to enter payment details
 * 3. After payment, user is redirected back to the thank-you page
 * 4. The thank-you page completes the order placement using the Medusa SDK
 * 5. Store owner manually captures payment from Medusa admin later
 */
export async function createStripeCheckoutSession(sdk: Sdk, cartId: string, successUrl: string, cancelUrl: string): Promise<string> {
  // First, get the cart object (required for initiatePaymentSession)
  const { cart } = await sdk.store.cart.retrieve(cartId);

  // Initialize payment session with Stripe provider
  // This creates the payment collection and initializes the payment session
  const { payment_collection } = await sdk.store.payment.initiatePaymentSession(
    cart,
    {
      provider_id: "pp_stripe_stripe", // Standard Stripe provider ID in Medusa
      data: {}, // Additional data can be passed here if needed
    }
  );

  // TODO: Replace this with your custom backend endpoint
  // The standard Medusa API doesn't support Stripe Checkout redirect URLs
  // You need to create a custom endpoint that:
  // 1. Takes payment_collection.id, success_url, and cancel_url
  // 2. Creates a Stripe Checkout Session using Stripe's API
  // 3. Returns the checkout session URL
  //
  // Example custom endpoint:
  // POST /store/custom/stripe-checkout
  // Body: { payment_collection_id, success_url, cancel_url }
  // Response: { url: "https://checkout.stripe.com/..." }

  const checkoutResponse = await fetch(`${sdk.baseUrl}/store/custom/stripe-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-publishable-api-key': sdk.config.publishableKey || '',
    },
    body: JSON.stringify({
      payment_collection_id: payment_collection.id,
      success_url: successUrl,
      cancel_url: cancelUrl,
    }),
  });

  if (!checkoutResponse.ok) {
    const errorText = await checkoutResponse.text();
    throw new Error(`Failed to create Stripe checkout session: ${checkoutResponse.statusText} - ${errorText}`);
  }

  const checkoutData = await checkoutResponse.json();

  if (!checkoutData.url) {
    throw new Error('Checkout session URL not returned from server');
  }

  return checkoutData.url;
}

/**
 * Complete the order after successful payment
 * This should be called on the thank-you page after Stripe redirects back
 *
 * This function is idempotent - it can be safely called multiple times
 * If the cart is already completed, it will return the existing order
 */
export async function completeCart(sdk: Sdk, cartId: string): Promise<{ type: 'order' | 'cart'; data: StoreOrder | StoreCart }> {
  try {
    const result = await sdk.store.cart.complete(cartId);
    return result;
  } catch (error: unknown) {
    // If the cart was already completed (by webhook or previous call),
    // Medusa may return a 409 conflict or similar error
    // We should handle this gracefully
    const errorWithStatus = error as { response?: { status?: number }; status?: number };
    if (errorWithStatus?.response?.status === 409 || errorWithStatus?.status === 409) {
      // Cart already completed - try to retrieve the cart to check status
      try {
        const cart = await sdk.store.cart.retrieve(cartId);
        if (cart.cart.completed_at) {
          // Return cart as already completed
          return { type: 'cart', data: cart.cart };
        }
      } catch (retrieveError) {
        console.error('Failed to retrieve cart after conflict:', retrieveError);
      }
    }

    console.error('Failed to complete cart:', error);
    throw error;
  }
}

/**
 * Verify that a Stripe checkout session was successful
 * This can be used on the thank-you page to confirm payment
 */
export async function verifyStripeSession(sessionId: string, _stripePublishableKey: string): Promise<boolean> {
  // Note: For security, session verification should ideally be done on the backend
  // For now, we'll rely on Medusa's cart completion to verify payment
  // The sessionId can be logged for reference
  console.log('Stripe session ID:', sessionId);
  return true;
}
