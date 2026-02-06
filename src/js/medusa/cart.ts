import type { StoreCart } from "@medusajs/types";
import type { Sdk } from "./types";

type CreateCartIdResult =
  | { type: "RETRIEVED_CACHED_ID", cartId: string }
  | { type: "CREATED_NEW_CART", cartId: string, cart: StoreCart };

const CART_ID_KEY = "MEDUSA_CART_TOKEN";

async function createNewCart(sdk: Sdk): Promise<StoreCart> {
  const createdCart = await sdk.store.cart.create({});
  return createdCart.cart;
}

function saveCartId(cartId: string): void {
  localStorage.setItem(CART_ID_KEY, cartId);
}

function clearCartId(): void {
  localStorage.removeItem(CART_ID_KEY);
}

async function createOrRetrieveCartId(sdk: Sdk): Promise<CreateCartIdResult> {
  const existingItem = localStorage.getItem(CART_ID_KEY);

  if (existingItem)
    return { type: "RETRIEVED_CACHED_ID", cartId: existingItem };

  const newCart = await createNewCart(sdk);

  saveCartId(newCart.id);

  return { type: "CREATED_NEW_CART", cartId: newCart.id, cart: newCart };
}

/**
 * Checks if the Stripe webhook handler has marked this cart as completed.
 */
function cartIsCompleted(cart: StoreCart): boolean {
  return cart.metadata?.completed === true;
}

/**
 * Gets the order ID from a completed cart's metadata.
 * Returns null if the cart hasn't been completed or has no order ID.
 */
export function getOrderIdFromCart(cart: StoreCart): string | null {
  if (!cartIsCompleted(cart)) {
    return null;
  }
  const orderId = cart.metadata?.order_id;
  return typeof orderId === "string" ? orderId : null;
}

/**
 * Clears the stored cart ID from localStorage.
 * Should be called after an order is placed to ensure the next cart is fresh.
 */
export function clearStoredCartId(): void {
  clearCartId();
}

/**
 * Gets the current cart if one exists in localStorage.
 * Does not create a new cart if none exists.
 * Returns null if no cart ID is stored.
 */
export async function getCurrentCart(sdk: Sdk): Promise<StoreCart | null> {
  const existingId = localStorage.getItem(CART_ID_KEY);
  if (!existingId) {
    return null;
  }

  try {
    return await getCart(sdk, existingId);
  } catch {
    // Cart may have been deleted or expired
    clearCartId();
    return null;
  }
}

/**
 * Gets the Medusa cart with the given id. Does not check if the cart has already been purchased.
 */
async function getCart(sdk: Sdk, cartId: string): Promise<StoreCart> {
  const { cart } = await sdk.store.cart.retrieve(cartId);
  return cart;
}

/**
 * Tries to retrieve the user's existing Medusa cart. If it does not exist, or it has already been purchased, a new cart will be created instead.
 */
export async function createOrRetrieveCart(sdk: Sdk): Promise<StoreCart> {
  const result = await createOrRetrieveCartId(sdk);

  if (result.type === "RETRIEVED_CACHED_ID") {
    const cart = await getCart(sdk, result.cartId);

    // If this cart has been completed, clear the id and create a new one
    if (cartIsCompleted(cart)) {
      clearCartId();
      return await createOrRetrieveCart(sdk);
    }

    return cart;
  }

  return result.cart;
}

export async function addItemToCart(sdk: Sdk, cartId: string, productVariantId: string): Promise<StoreCart> {
  const { cart } = await sdk.store.cart.createLineItem(cartId, {
    quantity: 1,
    variant_id: productVariantId
  });
  return cart;
}

export async function setItemQuantity(sdk: Sdk, cartId: string, lineItemId: string, quantity: number): Promise<StoreCart> {
  if (quantity === 0) {
    const result = await sdk.store.cart.deleteLineItem(cartId, lineItemId);

    if (!result.deleted)
      throw new Error(`Line item ${lineItemId} was not deleted.`);

    return await getCart(sdk, cartId);
  }

  const result = await sdk.store.cart.updateLineItem(cartId, lineItemId, { quantity });
  return result.cart;
}

type AddDigitalToCartResponse = {
  ok: true;
};

/**
 * Adds a product to the cart via the custom digital endpoint.
 * This endpoint handles both physical and digital items, setting appropriate metadata.
 *
 * @param isDigital - If true, the item is added as a digital purchase with special metadata
 */
export async function addDigitalItemToCart(
  sdk: Sdk,
  cartId: string,
  productId: string,
  variantId: string,
): Promise<StoreCart> {
  const response = await sdk.client.fetch<AddDigitalToCartResponse>(
    `/store/custom/cart-add-digital`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: {
        cart_id: cartId,
        product_id: productId,
        variant_id: variantId,
        quantity: 1,
        is_digital: true,
      },
    }
  );

  // Must refetch the cart, as this endpoint doesn't send it back
  return await getCart(sdk, cartId);
}
