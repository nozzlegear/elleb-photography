import type { Sdk } from "./types";
import type { StoreOrder } from "@medusajs/types";

export async function getOrderDetails(sdk: Sdk, orderId: string): Promise<StoreOrder> {
  const { order } = await sdk.store.order.retrieve(orderId);
  return order;
}
