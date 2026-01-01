import * as products from "../medusa/products";
import { configureSdk } from "../medusa/index";
import { createOrRetrieveCart, addItemToCart } from "../medusa/cart";
import type { StoreProduct } from "@medusajs/types";

const sdk = configureSdk();
const productTemplateId = "product-card-template";
const renderTargetId = "products-container";
const productTemplateEl = document.getElementById(productTemplateId) as HTMLTemplateElement | undefined;
const renderTargetEl = document.getElementById(renderTargetId) as HTMLDivElement | undefined;

if (!productTemplateEl)
  throw new Error(`Could not find a product template element with id ${productTemplateId}.`);
if (!renderTargetEl)
  throw new Error(`Could not find a render target element with id ${renderTargetId}.`);

if (sdk && productTemplateEl && renderTargetEl) {
  const loadedProducts = await products.listProducts(sdk);
  await products.renderProductsIntoTemplate(loadedProducts.products, handleProductClick, productTemplateEl, renderTargetEl);
}

async function handleProductClick(this: HTMLAnchorElement, product: StoreProduct) {
  if (!sdk) {
    console.error('Medusa SDK not configured');
    return;
  }

  try {
    const cart = await createOrRetrieveCart(sdk);
    const defaultVariant = product.variants?.[0];

    if (!defaultVariant) {
      console.error('No variants found for product:', product.title);
      return;
    }

    // Update button state while loading
    const buttonText = this.querySelector('.kg-product-card-button-text');
    const originalText = buttonText?.textContent;
    if (buttonText) {
      buttonText.textContent = 'Adding...';
    }

    const updatedCart = await addItemToCart(sdk, cart.id, defaultVariant.id);

    // Dispatch cart updated event
    window.dispatchEvent(new CustomEvent('cart-updated', { detail: updatedCart }));

    // Update button state to show success
    if (buttonText) {
      buttonText.textContent = 'Added!';
      setTimeout(() => {
        buttonText.textContent = originalText || 'Add to Cart';
      }, 2000);
    }

    console.log('Product added to cart:', product.title);
  } catch (error) {
    console.error('Failed to add product to cart:', error);

    // Reset button state on error
    const buttonText = this.querySelector('.kg-product-card-button-text');
    if (buttonText) {
      buttonText.textContent = 'Error';
      setTimeout(() => {
        buttonText.textContent = 'Add to Cart';
      }, 2000);
    }
  }
}
