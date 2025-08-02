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
