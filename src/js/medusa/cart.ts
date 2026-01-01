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
 * Gets the Medusa cart with the given id. Does not check if the cart has already been purchased.
 */
async function getCart(sdk: Sdk, cartId: string): Promise<StoreCart> {
  let { cart } = await sdk.store.cart.retrieve(cartId);
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
