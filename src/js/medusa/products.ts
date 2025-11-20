import type { Sdk, ProductMetaData } from "./types";
import type { StoreProduct, StoreProductListResponse } from "@medusajs/types";
import { formatPrice } from "./format-price";

export async function listProducts(sdk: Sdk): Promise<StoreProductListResponse> {
  return await sdk.store.product.list({
    fields: "*variants,*variants.calculated_price,*options,*options.values"
  });
}

/**
 * Numerically sorts the products array by the metadata property `rank`, with the lowest absolute numerical value
 * having the highest priority.
 */
function sortProductsByMetadataRank(products: StoreProduct[]) {
  return products.sort((a, b) => (a.metadata?.rank as number) - (b.metadata?.rank as number));
}

export async function renderProductsIntoTemplate(
  products: StoreProduct[],
  onClickBuy: (storeProduct: StoreProduct) => unknown,
  template: HTMLTemplateElement,
  target: HTMLElement
) {
  products = sortProductsByMetadataRank(products);

  for (const product of products) {
    const clone = template.content.cloneNode(true) as DocumentFragment;

    const productImgEl = clone.querySelector<HTMLImageElement>(".kg-product-card-image");
    const productTitleEl = clone.querySelector<HTMLHeadingElement>("h4.kg-product-card-title");
    const productSubtitleEl = clone.querySelector<HTMLHeadingElement>("h5.kg-product-card-subtitle");
    const productDescriptionEl =clone.querySelector<HTMLDivElement>(".kg-product-card-description");
    const productRatingEl = clone.querySelector<HTMLDivElement>(".kg-product-card-rating");
    const productPriceEl = clone.querySelector<HTMLSpanElement>(".kg-product-card-price-amount");
    const productVariantsEl = clone.querySelector<HTMLDivElement>(".kg-product-card-variants");
    const productButtonEl = clone.querySelector<HTMLButtonElement>(".kg-product-card-button");
    const productButtonTextEl = clone.querySelector<HTMLSpanElement>(".kg-product-card-button-text");

    // Set the template's images
    if (productImgEl) {
      const images = product.images ?? [];
      const firstImageUrl = product.thumbnail ?? images[0]?.url;

      if (images.length > 1) {
        // Add images to the srcset
        const srcset: string[] = [];
        for (const image of images) {
          // Adding the thumbnail to the srcset is redundant if it's already the img's src
          if (image.url !== firstImageUrl) {
            srcset.push(`${image.url} 2x`);
          }
        }

        productImgEl.srcset = srcset.join(", ");
      }

      // Set the fallback img element
      if (firstImageUrl) {
        productImgEl.src = firstImageUrl;
        productImgEl.alt = product.title;
      }
    }

    // Set the template's title
    if (productTitleEl && product.title) {
      productTitleEl.textContent = product.title;
    } else {
      // Remove the subtitle element
      productTitleEl?.remove();
    }

    // Set the template's subtitle
    if (productSubtitleEl && product.subtitle) {
      productSubtitleEl.textContent = product.subtitle;
    } else {
      // Remove the subtitle element
      productSubtitleEl?.remove();
    }

    // Set the template's description
    if (productDescriptionEl && product.description) {
      productDescriptionEl.innerText = product.description;
    }

    // Set the template's button
    if (productButtonEl) {
      productButtonEl.addEventListener("click", ev => {
        ev.preventDefault();
        onClickBuy.apply(productButtonEl, [product]);
      });

      if (productButtonTextEl && product.status === "proposed") {
        productButtonTextEl.textContent = "Coming Soon";
        productButtonTextEl.title = "This product is not yet available, check back soon!"
        productButtonEl.disabled = true;
      }
    }

    if (productRatingEl) {
      appendStarRating(productRatingEl, product);
    }

    // Set up variants and pricing
    if (product.variants && product.variants.length > 0) {
      const defaultVariant = product.variants[0];

      // Set initial price
      if (productPriceEl && defaultVariant.calculated_price) {
        productPriceEl.textContent = formatPrice(defaultVariant.calculated_price, "subtotal");
      }

      // Set up variant selection
      if (productVariantsEl && product.options && product.options.length > 0) {
        setupVariantSelection(product, productVariantsEl, productPriceEl);
      }
    }

    target.appendChild(clone);
  }
}

function appendStarRating(ratingContainer: HTMLElement, product: StoreProduct): void {
  const templateId = "star-rating-template";
  const starTemplate = document.getElementById(templateId) as HTMLTemplateElement | null;

  if (!starTemplate)
    throw new Error(`Template #${templateId} not found`);

  const rating = (product.metadata as ProductMetaData | undefined)?.rating;

  if (typeof rating !== 'number' || rating <= 0)
    return;

  const activeClass = 'kg-product-card-rating-active';

  for (let i = 1; i <= 5; i++) {
    const starRating = starTemplate.content.cloneNode(true) as HTMLElement;

    if (rating >= i)
      starRating.classList.add(activeClass);

    ratingContainer.appendChild(starRating);
  }
}

function setupVariantSelection(product: StoreProduct, variantsContainer: HTMLElement, priceElement: HTMLSpanElement | null) {
  if (!product.options || !product.variants) return;

  const selectedOptions: Record<string, string> = {};

  // Create option selectors
  product.options.sort((l, r) => l.title.localeCompare(r.title)).forEach(option => {
    if (!option.values || option.values.length <= 1) return;

    const optionDiv = document.createElement('div');
    optionDiv.className = 'kg-product-option';

    const label = document.createElement('label');
    label.textContent = option.title || 'Option';
    label.className = 'kg-product-option-label';

    const select = document.createElement('select');
    select.className = 'kg-product-option-select';
    select.dataset.optionId = option.id;

    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = `Select ${option.title}`;
    select.appendChild(defaultOption);

    // Add option values
    option.values.forEach(value => {
      const optionElement = document.createElement('option');
      optionElement.value = value.value;
      optionElement.textContent = value.value;
      select.appendChild(optionElement);
    });

    // Set first value as selected by default
    if (option.values.length > 0) {
      select.value = option.values[0].value;
      selectedOptions[option.id] = option.values[0].value;
    }

    // Add change event listener
    select.addEventListener('change', () => {
      selectedOptions[option.id] = select.value;
      updatePriceForSelectedVariant(product, selectedOptions, priceElement);
    });

    optionDiv.appendChild(label);
    optionDiv.appendChild(select);
    variantsContainer.appendChild(optionDiv);
  });

  // Show variants container if we have options
  if (product.options.length > 0) {
    variantsContainer.style.display = 'block';
  }

  // Update initial price
  updatePriceForSelectedVariant(product, selectedOptions, priceElement);
}

function updatePriceForSelectedVariant(product: StoreProduct, selectedOptions: Record<string, string>, priceElement: HTMLSpanElement | null) {
  if (!product.variants || !priceElement) return;

  // Find matching variant based on selected options
  const matchingVariant = product.variants.find(variant => {
    if (!variant.options) return false;

    return variant.options.every(variantOption => {
      return selectedOptions[variantOption.option_id!] === variantOption.value;
    });
  });

  if (matchingVariant && matchingVariant.calculated_price) {
    priceElement.textContent = formatPrice(matchingVariant.calculated_price, "subtotal");
  }
}
