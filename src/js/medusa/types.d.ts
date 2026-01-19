import Medusa from "@medusajs/js-sdk";

export type ProductRating = 1 | 2 | 3 | 4 | 5;

export type ProductMetaData = {
  rating?: ProductRating;
  has_digital_version?: boolean;
}

/**
 * Metadata stored on cart/order line items to track digital purchases.
 * Set by the backend when adding digital items via /store/custom/cart-add-digital.
 */
export type DigitalLineItemMetadata = {
  is_digital?: boolean;
  digital_file_ids?: string[];
}

export type Sdk = InstanceType<typeof Medusa>;
