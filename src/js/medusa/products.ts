import { StoreProduct, StoreProductListResponse } from "@medusajs/types";
import { sdk } from "./"

export async function listProducts(): Promise<StoreProductListResponse> {
  return await sdk.store.product.list();
}

export async function renderProductsIntoTemplate(products: StoreProduct[], template: HTMLTemplateElement, target: HTMLElement) {

  for (let product of products) {
    const clone = template.content.cloneNode(true) as DocumentFragment;

    const productImgEl = clone.querySelector<HTMLImageElement>(".kg-product-card-image");
    const productTitleEl = clone.querySelector<HTMLHeadingElement>(".kg-product-card-title");
    const productSubtitleEl = clone.querySelector<HTMLHeadingElement>(".kg-product-card-title");
    const productDescriptionEl =clone.querySelector<HTMLDivElement>(".kg-product-card-description");
    const productRatingEl = clone.querySelector<HTMLDivElement>(".kg-product-card-rating");
    const productButtonEl = clone.querySelector<HTMLAnchorElement>(".kg-product-card-button");


    // Set the template's image
    if (productImgEl) {
      const imageUrl = product.images?.at(0)?.url ?? product.thumbnail;

      if (imageUrl) {
        productImgEl.src = imageUrl;
        productImgEl.alt = product.title;
      }
    }

    // Set the template's title and subtitle
    if (productTitleEl) {
      productTitleEl.textContent = product.title;

      if (productSubtitleEl && product.subtitle) {
        productSubtitleEl.textContent = product.subtitle;
      } else {
        // Remove the subtitle element
        productSubtitleEl?.remove();
      }
    }

    // Set the template's description
    if (productDescriptionEl && product.description) {
      productDescriptionEl.innerText = product.description;
    }

    // Set the template's button
    if (productButtonEl) {
      // TODO: clicking on the button should open Stripe's in-page payment gateway
    }

    target.appendChild(clone);
  }
}
