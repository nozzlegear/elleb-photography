import * as products from "../medusa/products";
import { configureSdk } from "../medusa/index";

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
  await products.renderProductsIntoTemplate(loadedProducts.products, productTemplateEl, renderTargetEl);
}
