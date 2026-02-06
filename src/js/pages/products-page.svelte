<script lang="ts">
import * as products from "../medusa/products";
import { configureSdk } from "../medusa/index";
import ProductImage from "./components/ProductImage.svelte";
import { formatPrice } from "../medusa/format-price";
import { createOrRetrieveCart, addDigitalItemToCart, addItemToCart } from "../medusa/cart";
import { fetchDigitalProductInfoBatch, type DigitalProductInfo } from "../medusa/digital-products";
import type { StoreProductOption, StoreCart } from "@medusajs/types";
import { SvelteMap, SvelteSet } from "svelte/reactivity";
  import { openSideNav } from "../utils";

const configuredSdk = configureSdk();

if (!configuredSdk)
  throw new Error('SDK not configured.');

const sdk = configuredSdk;

// Load products and cart in parallel
const [loadedProducts, initialCart] = await Promise.all([
  products.listProducts(sdk),
  createOrRetrieveCart(sdk)
]);

let cart = $state<StoreCart>(initialCart);

// Fetch digital info for all products
const allProductIds = loadedProducts.products.map(p => p.id);
const digitalProductsInfo = $state<Map<string, DigitalProductInfo>>(
  await fetchDigitalProductInfoBatch(sdk, allProductIds)
);

// Select the first value for each option as a default
const selectedOptions = $state<SvelteMap<string, string>>(loadedProducts.products.reduce((state, product) => {
  for (const option of product.options!) {
    const firstValue = option.values![0];
    if (firstValue)
      state.set(makeCompositeKey(product.id, option.id), firstValue.id);
  }

  return state;
}, new SvelteMap<string, string>()));

// Track "Include digital file" checkbox per product
const includeDigitalCheckbox = $state<SvelteMap<string, boolean>>(
  new SvelteMap(
    loadedProducts.products
      .filter(p => digitalProductsInfo.has(p.id))
      .map(p => [p.id, false])
  )
);

// Track loading state per product (using SvelteSet for automatic reactivity)
const addingToCart = $state<SvelteSet<string>>(new SvelteSet());

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

function getSelectedVariantForProduct(productId: string) {
  const productOptions = getSelectedOptionsForProduct(productId);
  const selectedOptionsLength = productOptions.size;

  if (selectedOptionsLength === 0) {
    return null;
  }

  const product = loadedProducts.products.find(p => p.id === productId);
  if (!product) {
    return null;
  }

  // Find matching variant based on selected options
  // Check that each variant option's value ID matches the selected value ID
  const matchingVariant = (product?.variants ?? []).find(variant => {
    if (!variant.options) return false;
    if (variant.options.length !== selectedOptionsLength) return false;

    return variant.options.every(variantOption => {
      const selectedValueId = productOptions.get(variantOption.option_id!);
      return selectedValueId === variantOption.id;
    });
  });

  return matchingVariant ?? null;
}

function formatSelectedVariantPrice(productId: string): string {
  const matchingVariant = getSelectedVariantForProduct(productId);

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

const selectedVariantPrices = $derived(new Map<string, string>(
  getProductIdsWithSelections().map(productId => [productId, formatSelectedVariantPrice(productId)])
))

// Compute total price (physical + digital if checkbox checked)
function getDisplayPrice(productId: string): string {
  const physicalPrice = selectedVariantPrices.get(productId) ?? "";
  const includeDigital = includeDigitalCheckbox.get(productId) ?? false;
  const digitalInfo = digitalProductsInfo.get(productId);

  if (!includeDigital || !digitalInfo?.digital_price) {
    return physicalPrice;
  }

  // Get the physical price amount
  const variant = getSelectedVariantForProduct(productId);
  if (!variant?.calculated_price) {
    return physicalPrice;
  }

  const physicalAmount = variant.calculated_price.calculated_amount_without_tax
    ?? variant.calculated_price.original_amount
    ?? 0;
  // Digital price from API is in cents, convert to match Medusa's format
  const digitalAmount = digitalInfo.digital_price / 100;
  const totalAmount = physicalAmount + digitalAmount;
  const currency = variant.calculated_price.currency_code ?? "usd";

  return formatPrice(totalAmount, currency);
}

// Add physical item to cart
async function handleAddToCart(productId: string) {
  const variant = getSelectedVariantForProduct(productId);
  if (!variant) {
    console.error("No variant selected for product", productId);
    return;
  }

  addingToCart.add(productId);

  try {
    const includeDigital = includeDigitalCheckbox.get(productId) ?? false;

    // Add physical item
    let updatedCart = await addItemToCart(sdk, cart.id, variant.id);

    // If checkbox is checked, also add digital item
    if (includeDigital && digitalProductsInfo.has(productId)) {
      updatedCart = await addDigitalItemToCart(sdk, updatedCart.id, productId, variant.id);
    }

    cart = updatedCart;

    // Open the cart sidenav and dispatch a cart-updated event
    openSideNav();
    window.dispatchEvent(new CustomEvent('cart-updated', { detail: cart }));

    // Reset checkbox after adding
    includeDigitalCheckbox.set(productId, false);
  } catch (error) {
    console.error("Failed to add item to cart:", error);
  } finally {
    addingToCart.delete(productId);
  }
}

// Add digital-only item to cart
async function handleBuyDigitalOnly(productId: string) {
  const variant = getSelectedVariantForProduct(productId);
  if (!variant) {
    // For digital-only, we can use any variant (backend uses it for reference)
    const product = loadedProducts.products.find(p => p.id === productId);
    if (!product?.variants?.[0]) {
      console.error("No variant available for product", productId);
      return;
    }
  }

  addingToCart.add(productId);

  try {
    // Use selected variant or fall back to first variant
    const variantId = variant?.id ?? loadedProducts.products.find(p => p.id === productId)?.variants?.[0]?.id;
    if (!variantId) {
      console.error("No variant ID available for product", productId);
      return;
    }

    const updatedCart = await addDigitalItemToCart(sdk, cart.id, productId, variantId);
    cart = updatedCart;

    // Open the cart sidenav and dispatch a cart-updated event
    openSideNav();
    window.dispatchEvent(new CustomEvent('cart-updated', { detail: cart }));
  } catch (error) {
    console.error("Failed to add digital item to cart:", error);
  } finally {
    addingToCart.delete(productId);
  }
}

// Format digital price for display
function formatDigitalPrice(productId: string): string {
  const digitalInfo = digitalProductsInfo.get(productId);
  if (!digitalInfo?.digital_price) return "";

  // Digital price is in cents from the API, convert to dollars for formatPrice
  return formatPrice(digitalInfo.digital_price / 100, "usd");
}

// Check if product has digital version
function hasDigitalVersion(productId: string): boolean {
  return digitalProductsInfo.has(productId);
}

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
  .kg-product-card-actions > .kg-product-digital-only-section > button.kg-product-card-button.kg-product-card-btn-secondary {
    width: 100%;
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

                {#if hasDigitalVersion(product.id)}
                  <hr>
                  <div class="kg-product-digital-option">
                    <label class="kg-product-digital-checkbox">
                      <input
                        type="checkbox"
                        checked={includeDigitalCheckbox.get(product.id) ?? false}
                        onchange={(e) => includeDigitalCheckbox.set(product.id, e.currentTarget.checked)}
                      />
                      <span>Include digital file (+{formatDigitalPrice(product.id)})</span>
                    </label>
                  </div>
                {/if}
            </div>

            <div class="kg-product-card-price">
                Price:
                <span class="kg-product-card-price-amount">{getDisplayPrice(product.id)}</span>
            </div>

            <div class="kg-product-card-actions">
              <button
                class="kg-product-card-button kg-product-card-btn-accent button is-primary"
                disabled={addingToCart.has(product.id)}
                onclick={() => handleAddToCart(product.id)}>
                  <span class="kg-product-card-button-text">
                    {#if addingToCart.has(product.id)}
                      Adding...
                    {:else}
                      Add to Cart
                    {/if}
                  </span>
              </button>

              {#if hasDigitalVersion(product.id)}
                <div class="kg-product-digital-only-section">
                  <p class="kg-product-digital-only-text">Not interested in a physical print?</p>
                  <button
                    class="kg-product-card-button kg-product-card-btn-secondary button is-secondary"
                    disabled={addingToCart.has(product.id)}
                    onclick={() => handleBuyDigitalOnly(product.id)}>
                      <span class="kg-product-card-button-text">
                        {#if addingToCart.has(product.id)}
                          Adding...
                        {:else}
                          Buy Digital File Only - {formatDigitalPrice(product.id)}
                        {/if}
                      </span>
                  </button>
                </div>
              {/if}
            </div>
        </div>
    </div>
{/each}
