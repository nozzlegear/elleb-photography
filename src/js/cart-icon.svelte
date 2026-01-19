<script lang="ts">
  import type { StoreCart } from "@medusajs/types";
  import { onMount } from "svelte"

  onMount(() => {
    // Update the count whenever the cart is updated. This event is also emitted
    // by cart-sidebar.svelte the first time it loads the cart, giving us our
    // initial count.
    window.addEventListener("cart-updated", refreshCount);

    return () => {
      window.removeEventListener("cart-updated", refreshCount);
    }
  });

  let count = $state<number | undefined>()

  function refreshCount(event: Event) {
    if (event.type !== "cart-updated") {
      return;
    }
    if (!(event instanceof CustomEvent)) {
      return;
    }

    const evt: CustomEvent<StoreCart> = event satisfies CustomEvent<StoreCart>;
    count = evt.detail?.items?.length ?? undefined;
  }
</script>
<style>
</style>
<svg class="icon is-stroke w-6 h-6" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <title>Shopping Cart</title>
  <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">
    <path d="M4 19a2 2 0 1 0 4 0a2 2 0 1 0-4 0m11 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0"/>
    <path d="M17 17H6V3H4"/>
    <path d="m6 5l14 1l-1 7H6"/>
  </g>
</svg>
{#if count !== undefined}
  <span class="cart-count absolute -top-2 -right-2 bg-black text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">{count}</span>
{/if}
