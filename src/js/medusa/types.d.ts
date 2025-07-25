import type { Medusa } from "@medusajs/js-sdk";

export type ProductRating = 1 | 2 | 3 | 4 | 5;

export type ProductMetaData = {
  rating?: ProductRating
}

export type Sdk = Medusa;
