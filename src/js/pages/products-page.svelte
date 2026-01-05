<script lang="ts">
import * as products from "../medusa/products";
import { configureSdk } from "../medusa/index";
import ProductImage from "./components/ProductImage.svelte";
import { formatPrice } from "../medusa/format-price";
import { createOrRetrieveCart, addItemToCart } from "../medusa/cart";
import type { StoreProduct, StoreProductOption } from "@medusajs/types";

const sdk = configureSdk();

if (!sdk)
  throw new Error('SDK not configured.');

const loadedProducts = await products.listProducts(sdk);
let optionNodes = $state(new Map<string, Map<string, string>>());

function bindOptionNodeGet(productId: string, option: StoreProductOption) {
  return () => optionNodes.get(productId)?.get(option.id) ?? `Select ${option.title}`
}

function bindOptionNodeSet(productId: string, option: StoreProductOption) {
  return (value?: string) => {
    const optionMap = new Map(optionNodes.get(productId) ?? new Map<string, string>());

    if (value) {
      optionMap.set(option.id, value);
    } else {
      optionMap.delete(option.id);
    }

    optionNodes = new Map(optionNodes).set(productId, optionMap);
  }
}

function formatSelectedVariantPrice(productId: string): string {
  const selectedOptions = optionNodes.get(productId);
  const selectedOptionsLength = selectedOptions?.size ?? 0;

  if (!selectedOptions || selectedOptionsLength === 0) {
    console.log({selectedOptions, selectedOptionsLength});
    return "zero options";
  }

  const product = loadedProducts.products.find(p => p.id === productId);
  if (!product) {
    console.log("no product matching product id", {productId, products: loadedProducts.products});
    return "no product";
  }

  // Find matching variant based on selected options
  const matchingVariant = (product?.variants ?? []).find(variant => {
    if (!variant.options) return false;
    if (variant.options.length !== selectedOptionsLength) return false;

    return variant.options.every(variantOption => {
      return selectedOptions.has(variantOption.option_id!);
    });
  });

  console.log({matchingVariant, selectedOptions, selectedOptionsLength})

  return matchingVariant?.calculated_price
    ? formatPrice(matchingVariant.calculated_price, "subtotal")
    : "no variant";
}

let selectedVariantPrices = $derived(new Map<string, string>(
  [...optionNodes.keys()].map(productId => [productId, formatSelectedVariantPrice(productId)])
))

</script>

<style>
</style>

{#each loadedProducts.products as product (product.id)}
    <div class="kg-card kg-product-card">
        <div class="kg-product-card-container">
            <ProductImage product={product} />

            <div class="kg-product-card-title-container">
              <h4 class="kg-product-card-title">{product.title}</h4>
              <h5 class="kg-product-card-subtitle">{product.subtitle}</h5>
            </div>

            <div class="kg-product-card-rating">
                <!-- Add 1-5 stars here to indicate rating -->
            </div>

            <div class="kg-product-card-description">{product.description}</div>

            <div class="kg-product-card-variants">
                <!-- Variant options will be populated here -->
                {#each product.options as option}
                <div class="kg-product-option">
                  <label for={option.id} class="kg-product-option-label">
                    {option.title}
                  </label>
                  <select
                     class="kg-product-option-select"
                     name={option.id}
                     bind:value={
                      bindOptionNodeGet(product.id, option),
                      bindOptionNodeSet(product.id, option)
                     }>
                    {#each option.values as value}
                      <option value={value.id}>
                        {value.value}
                      </option>
                    {/each}
                  </select>
                </div>
                {/each}
            </div>

            <div class="kg-product-card-price">
                Price:
                <span class="kg-product-card-price-amount">{selectedVariantPrices.get(product.id) ?? ""}</span>
            </div>

            <button class="kg-product-card-button kg-product-card-btn-accent button is-primary">
                <span class="kg-product-card-button-text">Add to Cart</span>
            </button>
        </div>
    </div>
{/each}

<template id="star-rating-template">
    <span class="kg-product-card-rating-active kg-product-card-rating-star">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"/></svg>
    </span>
</template>
