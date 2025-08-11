import type { StoreCart } from "@medusajs/types";
import type { Sdk } from "./types";

export async function createOrRetrieveCartId(sdk: Sdk): Promise<string> {
  const CART_ID_KEY = "MEDUSA_CART_TOKEN";
  const existingItem = localStorage.getItem(CART_ID_KEY);

  if (existingItem)
    return existingItem;

  const createdCart = await sdk.store.cart.create({});
  localStorage.setItem(CART_ID_KEY, createdCart.cart.id);
  return createdCart.cart.id;
}

export async function getCart(sdk: Sdk, cartId: string): Promise<StoreCart> {
  const { cart } = await sdk.store.cart.retrieve(cartId)
  return cart;
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
