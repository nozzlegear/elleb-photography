<script lang="ts">
  import type { StoreCart } from "@medusajs/types";
  import { configureSdk } from "./medusa"
  import { createOrRetrieveCart, setItemQuantity } from "./medusa/cart";
  import { createStripeCheckoutSession } from "./medusa/checkout";
  import { formatPrice } from "./medusa/format-price";

  type LoadingState =
    | { type: "loading" }
    | { type: "error", message: string }
    | { type: "done" };

  let loading = $state<LoadingState>({type: "loading"});

  // Load the cart
  const sdk = configureSdk()!;

  // These values may change, as the cart id needs to be reset after the cart has been purchased
  let cart = $state<StoreCart | null>(null);

  // Create a promise for initial cart loading
  const cartPromise = createOrRetrieveCart(sdk).then(async (userCart) => {
    cart = userCart;
    loading = {type: "done"};
    return userCart;
  });

  const currencyCode = $derived(cart?.currency_code);
  const cartTotal = $derived<number>(cart?.total ?? 0);
  const cartEmpty = $derived(Array.isArray(cart?.items) ? cart.items.length === 0 : true);
  // let itemCount = $derived(cart.items?.reduce((total, item) => total + item.quantity, 0) ?? 0)

  $effect(() => {
    window.addEventListener("cart-updated", refreshCart);

    return () => {
      window.removeEventListener("cart-updated", refreshCart);
    }
  });

  async function handleCheckout() {
    if (loading.type === "loading")
      return;
    if (!sdk) {
      console.error('SDK not configured.');
      return;
    }
    if (!cart) {
      console.error("Cart has not yet loaded.");
      return;
    }

    // Show loading state
    loading = {type: "loading"};

    try {
      // Create Stripe checkout session and get the URL
      const checkoutUrl = await createStripeCheckoutSession(sdk, cart.id);

      // Redirect to Stripe checkout
      window.location.assign(checkoutUrl);
      loading = { type: "done" };
    } catch (error) {
      console.error('Failed to initiate checkout:', error);
      loading = {
        type: "error",
        message: "Failed to start checkout. Please try again."
      }
    }
  }

  async function refreshCart(event: Event) {
    if (event.type !== "cart-updated")
      return;
    if (!(event instanceof CustomEvent)) {
      console.error("RefreshCart received an event that's not an instance of CustomEvent:", event);
      return;
    }

    const evt = event satisfies CustomEvent<StoreCart>;
    cart = evt.detail
  }

  async function handleQuantityChange(action: "increase" | "decrease" | "remove", lineItemId: string) {
    if (loading.type === "loading")
      return;
    if (!sdk) {
      console.error('SDK not configured.');
      return;
    }
    if (!cart) {
      console.error("Cart has not yet loaded.");
      return;
    }

    const currentItem = cart?.items?.find(item => item.id === lineItemId);

    if (!currentItem)
      return;

    let newQuantity = currentItem.quantity;

    if (action === 'increase') {
      newQuantity += 1;
    } else if (action === 'decrease') {
      newQuantity = Math.max(0, newQuantity - 1);
    } else if (action === 'remove') {
      newQuantity = 0;
    }

    try {
      loading = {type: "loading"};
      cart = await setItemQuantity(sdk, cart.id, lineItemId, newQuantity);

      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('cart-updated', { detail: cart }));
      loading = { type: "done" };
    } catch (error) {
      console.error('Failed to update item quantity:', error);
      loading = {
        type: "error",
        message: "Failed to update item quantity, please try again."
      }
    }
  }
</script>

{#await cartPromise}
  <div class="cart-sidebar-container">
    <div class="cart-sidebar">
      <header class="cart-header">
        <h3>Shopping Cart</h3>
      </header>
      <div class="cart-items">
        <div class="cart-empty">
          <p>Loading cart...</p>
          <progress></progress>
        </div>
      </div>
    </div>
  </div>
{:then _}
  <div class="cart-sidebar-container">
    <div class="cart-sidebar">
        <header class="cart-header">
            <h3>Shopping Cart</h3>
        </header>

        <div class="cart-items">
            {#if cartEmpty}
              <div class="cart-empty">
                  <p>Your cart is empty</p>
              </div>
            {:else if cart}
              <div class="cart-list">
                {#each cart.items! as item (item.id)}
                <div class="cart-item">
                    <div class="cart-item-details">
                        <h5 class="cart-item-variant">{item.variant_title}</h5>
                        <h4 class="cart-item-title">{item.product_title}</h4>
                    </div>
                    <div class="cart-item-image">
                      <img src={item.thumbnail ?? '/assets/img/placeholder.jpg'}
                           alt={item.title}
                           class="w-full h-full object-cover rounded" />
                    </div>
                    <div class="cart-item-actions">
                        <div class="quantity-controls" role="group" aria-label="Quantity">
                          <button
                             type="button"
                             class="quantity-btn quantity-decrease"
                             aria-label="Decrease quantity"
                             disabled={loading.type === "loading"}
                             onclick={() => handleQuantityChange("decrease", item.id)}>-</button>
                            <span class="quantity-display" aria-live="polite">{item.quantity}</span>
                            <button
                                type="button"
                                class="quantity-btn quantity-increase"
                                aria-label="Increase quantity"
                                disabled={loading.type === "loading"}
                                onclick={() => handleQuantityChange("increase", item.id)}>+</button>
                        </div>
                    </div>
                    <div class="cart-item-remove">
                      <button class="cart-item-remove-btn" type="button" disabled={loading.type === "loading"} onclick={() => handleQuantityChange("remove", item.id)}>Remove</button>
                    </div>
                    <div class="cart-item-price" aria-live="polite" aria-atomic="true">
                      {#if item.unit_price && currencyCode}
                        <span class="unit-price">{formatPrice(item.unit_price, currencyCode)} each</span>
                      {/if}
                    </div>
                </div>
                {/each}
              </div>
            {/if}
        </div>
    </div>
    <footer class="cart-footer">
        <div class="cart-subtotal" aria-live="polite" aria-atomic="true">
            <span>Subtotal</span>
            <span class="cart-total-amount">{currencyCode ? formatPrice(cartTotal, currencyCode) : '$0.00'}</span>
        </div>
        <p class="cart-note">Shipping &amp; taxes calculated at checkout</p>
        {#if loading.type === "error"}
          <p>Error:</p>
          <code><pre>{loading.message}</pre></code>
          <button onclick={() => window.location.reload()}>Try again</button>
        {/if}
        <button class="checkout-button" class:cart-button--empty={cartEmpty} disabled={loading.type === "loading"} onclick={handleCheckout}>
          {#if loading.type === "loading" }
            Loading
          {:else}
            Checkout
          {/if}
        </button>
    </footer>
  </div>
{:catch error}
  <div class="cart-sidebar-container">
    <div class="cart-sidebar">
      <header class="cart-header">
        <h3>Shopping Cart</h3>
      </header>
      <div class="cart-items">
        <div class="cart-empty">
          <p>Error loading cart:</p>
          <code><pre>{error.message}</pre></code>
          <button onclick={() => window.location.reload()}>Try again</button>
        </div>
      </div>
    </div>
  </div>
{/await}
