<script lang="ts">
import * as products from "../medusa/products";
import { configureSdk } from "../medusa/index";
import ProductImage from "./components/ProductImage.svelte";
import { formatPrice } from "../medusa/format-price";
import { createOrRetrieveCart, addItemToCart } from "../medusa/cart";
import type { StoreProduct, StoreProductOption } from "@medusajs/types";
import { SvelteMap } from "svelte/reactivity";

const sdk = configureSdk();

if (!sdk)
  throw new Error('SDK not configured.');

const loadedProducts = await products.listProducts(sdk);
// Select the first value for each option as a default
let selectedOptions = $state<SvelteMap<string, string>>(loadedProducts.products.reduce((state, product) => {
  for (const option of product.options!) {
    const firstValue = option.values![0];
    if (firstValue)
      state.set(makeCompositeKey(product.id, option.id), firstValue.id);
  }

  return state;
}, new SvelteMap<string, string>()));

// Use composite keys: "productId:optionId" -> selectedValueId
function makeCompositeKey(productId: string, optionId: string): string {
  return `${productId}:${optionId}`;
}

function bindOptionNodeGet(productId: string, option: StoreProductOption) {
  return () => selectedOptions.get(makeCompositeKey(productId, option.id)) ?? `Select ${option.title}`;
}

function bindOptionNodeSet(productId: string, option: StoreProductOption) {
  return (value?: string) => {
    const key = makeCompositeKey(productId, option.id);

    if (value) {
      selectedOptions.set(key, value);
    } else {
      selectedOptions.delete(key);
    }
  };
}

function getSelectedOptionsForProduct(productId: string): Map<string, string> {
  const result = new Map<string, string>();

  for (const [compositeKey, valueId] of selectedOptions) {
    const [prodId, optionId] = compositeKey.split(':');
    if (prodId === productId) {
      result.set(optionId, valueId);
    }
  }

  return result;
}

function formatSelectedVariantPrice(productId: string): string {
  const productOptions = getSelectedOptionsForProduct(productId);
  const selectedOptionsLength = productOptions.size;

  if (selectedOptionsLength === 0) {
    return "";
  }

  const product = loadedProducts.products.find(p => p.id === productId);
  if (!product) {
    return "";
  }

  // Find matching variant based on selected options
  const matchingVariant = (product?.variants ?? []).find(variant => {
    if (!variant.options) return false;
    if (variant.options.length !== selectedOptionsLength) return false;

    return variant.options.every(variantOption => {
      return productOptions.has(variantOption.option_id!);
    });
  });

  console.log({matchingVariant, productOptions, selectedOptionsLength})

  return matchingVariant?.calculated_price
    ? formatPrice(matchingVariant.calculated_price, "subtotal")
    : "";
}

// Get unique product IDs that have selections
function getProductIdsWithSelections(): string[] {
  const productIds = new Set<string>();
  for (const compositeKey of selectedOptions.keys()) {
    const [productId] = compositeKey.split(':');
    productIds.add(productId);
  }
  return Array.from(productIds);
}

let selectedVariantPrices = $derived(new Map<string, string>(
  getProductIdsWithSelections().map(productId => [productId, formatSelectedVariantPrice(productId)])
))

</script>

<style>
  pre {
    margin: 0;
    padding: unset;
    max-width: 100%;
    border: 0;
    color: var(--text-base);
    font-size: 1rem;
    background: #fff;
  }
  pre {
    white-space: pre;
    word-spacing: normal;
    word-break: normal;
    word-wrap: normal;
    -moz-tab-size: 4;
    -o-tab-size: 4;
    tab-size: 4;
    -webkit-hyphens: none;
    hyphens: none;
  }
  .kg-product-card, .kg-product-card * {
      text-wrap-mode: wrap;
      font-family: ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
  }
</style>

{#each loadedProducts.products as product (product.id)}
    <div class="kg-card kg-product-card">
        <div class="kg-product-card-container">
            <ProductImage product={product} />

            <div class="kg-product-card-title-container">
              <h4 class="kg-product-card-title">{product.title}</h4>
              <h5 class="kg-product-card-subtitle">{product.subtitle}</h5>
            </div>

            {#if false}
            <div class="kg-product-card-rating">
              <!-- Add 1-5 stars here to indicate rating -->
              <span class="kg-product-card-rating-active kg-product-card-rating-star">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.729,1.2l3.346,6.629,6.44.638a.805.805,0,0,1,.5,1.374l-5.3,5.253,1.965,7.138a.813.813,0,0,1-1.151.935L12,19.934,5.48,23.163a.813.813,0,0,1-1.151-.935L6.294,15.09.99,9.837a.805.805,0,0,1,.5-1.374l6.44-.638L11.271,1.2A.819.819,0,0,1,12.729,1.2Z"/></svg>
              </span>
            </div>
            {/if}

            <div class="kg-product-card-description"><pre>{product.description}</pre></div>

            <div class="kg-product-card-variants">
              <hr>

              {#if true}
                <div class="kg-product-option">
                  <label for="digital-only" class="kg-product-option-label">
                    Format
                  </label>
                  <select>
                    <option value="physical-only">
                      Physical Print
                    </option>
                    <option value="digital-only">
                      Digital File only
                    </option>
                    <option value="physical-and-digital">
                      Physical Print and Digital File
                    </option>
                  </select>
                </div>
                <hr>
              {/if}

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
