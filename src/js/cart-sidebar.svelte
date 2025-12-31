<script lang="ts">
  import type { StoreCart } from "@medusajs/types";
  import { configureSdk } from "./medusa"
  import { createOrRetrieveCartId, getCart, setItemQuantity } from "./medusa/cart";
  import { createStripeCheckoutSession } from "./medusa/checkout";
  import { formatPrice } from "./medusa/format-price";

  let loading = $state(false);

  // Load the cart
  const sdk = configureSdk()!;

  // These values may change, as the cart id needs to be reset after the cart has been purchased
  let cartId = $state(await createOrRetrieveCartId(sdk));
  let cart = $state(await getCart(sdk, cartId));

  let currencyCode = $derived(cart.currency_code);
  let cartTotal = $derived<number>(cart?.total ?? 0);
  let cartEmpty = $derived(Array.isArray(cart.items) ? cart.items.length === 0 : true);
  // let itemCount = $derived(cart.items?.reduce((total, item) => total + item.quantity, 0) ?? 0)

  function openSidebar() {
    document.body.classList.add('has-sidenav');
  }

  $effect(() => {
    window.addEventListener("cart-updated", refreshCart);

    return () => {
      window.removeEventListener("cart-updated", refreshCart);
    }
  });

  async function handleCheckout() {
    if (!sdk || !cartId) {
      console.error('SDK or cart ID not available');
      return;
    }

    // Show loading state
    loading = true;

    try {
      // Create Stripe checkout session and get the URL
      const checkoutUrl = await createStripeCheckoutSession(sdk, cartId);

      // Redirect to Stripe checkout
      window.location.assign(checkoutUrl);
    } catch (error) {
      console.error('Failed to initiate checkout:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      loading = false;
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

    cartId = evt.detail.id;
    cart = evt.detail
    //
    // try {
    //   cart = await getCart(sdk, cartId);
    //   // updateDisplay();
    // } catch (error) {
    //   console.error('Failed to refresh cart:', error);
    //
    //   if (error instanceof Error) {
    //     //cartError = "Failed to refresh cart:" + error.message;
    //   }
    // }
  }

  async function handleQuantityChange(e: Event) {
    if (!sdk || !cartId) return;

    const target = e.target as HTMLElement;
    const action = target.dataset.action;
    const lineItemId = target.dataset.lineItemId;

    if (!action || !lineItemId) return;

    const currentItem = cart?.items?.find(item => item.id === lineItemId);
    if (!currentItem) return;

    let newQuantity = currentItem.quantity;

    if (action === 'increase') {
      newQuantity += 1;
    } else if (action === 'decrease') {
      newQuantity = Math.max(0, newQuantity - 1);
    }

    try {
      cart = await setItemQuantity(sdk, cartId, lineItemId, newQuantity);

      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('cart-updated', { detail: cart }));
    } catch (error) {
      console.error('Failed to update item quantity:', error);
    }
  }
</script>

<svelte:boundary>
  {#snippet pending()}
    <p>Loading...</p>
    <div>
      <progress></progress>
    </div>
  {/snippet}

  {#snippet failed(error, reset)}
    <p>Error:</p>
    <code><pre>{(error as any).message}</pre></code>
		<button onclick={reset}>oops! try again</button>
	{/snippet}

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
            {:else}
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
                             class="quantity-btn quantity-decrease"
                             aria-label="Decrease quantity"
                             disabled={loading}
                             onclick={handleQuantityChange}>-</button>
                            <span class="quantity-display" aria-live="polite">{item.quantity}</span>
                            <button
                                class="quantity-btn quantity-increase"
                                aria-label="Increase quantity"
                                disabled={loading}
                                onclick={handleQuantityChange}>+</button>
                        </div>
                    </div>
                    <div class="cart-item-remove">
                      <button class="cart-item-remove-btn" type="button" disabled={loading}>Remove</button>
                    </div>
                    <div class="cart-item-price" aria-live="polite" aria-atomic="true">
                      {#if item.item_total}
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
            <span class="cart-total-amount">{formatPrice(cartTotal, currencyCode)}</span>
        </div>
        <p class="cart-note">Shipping &amp; taxes calculated at checkout</p>
        <button class="checkout-button" class:cart-button--empty={cartEmpty} disabled={loading} onclick={handleCheckout}>
          {#if loading }
            Loading
          {:else}
            Checkout
          {/if}
        </button>
    </footer>
  </div>
</svelte:boundary>
