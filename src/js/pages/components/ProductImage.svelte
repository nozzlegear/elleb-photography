<script lang="ts">
  import type { StoreProduct } from "@medusajs/types";

  type Props = {
    product: StoreProduct
  }

  const { product }: Props = $props();
  const images = $derived(product.images ?? []);
  const firstImageUrl = $derived(product.thumbnail ?? images[0]?.url);
  // Add images to the srcset. Adding the thumbnail to the srcset is redundant
  // if it's already the img's src.
  const srcSet = $derived(images.filter(image => image.url !== firstImageUrl)
    .map(image => `${image.url} 2x`)
    .join(", ")
  );
</script>

<img src={firstImageUrl} srcset={srcSet} alt={product.title} class="kg-product-card-image" loading="lazy" />
