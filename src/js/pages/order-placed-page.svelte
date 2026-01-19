<script lang="ts">
  import type { StoreOrder, StoreCart } from '@medusajs/types';
  import { configureSdk } from '../medusa/index';
  import { useLoadingState } from "../use-loading-state.svelte";
  import { getOrderDetails } from "../medusa/orders";

  type Props = {
    site: {
      owner_email: string
    }
  }

  const { site }: Props = $props();

  const sdk = configureSdk();

  if (!sdk)
    return;

  const loadingState = useLoadingState(true);

  // Get order ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('order_id');
  let order: Promise<StoreOrder> | null;

  if (!orderId) {
    loadingState.setLoadingState("No checkout session found. Please contact support if you completed a payment.");
    order = null;
  } else {
    // Load the order
    order = getOrderDetails(sdk, orderId).then((order) => {
      loadingState.setLoadingState(false);
      return order;
    });
  }

</script>

<style>
    .thank-you-container {
        max-width: 800px;
        margin: 0 auto;
        padding: 4rem 2rem;
        text-align: center;
    }

    .order-loading {
        padding: 4rem 2rem;
    }

    .loading-spinner {
        width: 50px;
        height: 50px;
        border: 4px solid rgba(0, 0, 0, 0.1);
        border-left-color: #000;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 1rem;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    .success-icon,
    .error-icon {
        font-size: 4rem;
        margin-bottom: 1rem;
    }

    .success-icon {
        color: #10b981;
        font-weight: bold;
    }

    .error-icon {
        color: #ef4444;
    }

    .order-details {
        margin: 3rem 0;
        text-align: left;
        background: #f9fafb;
        padding: 2rem;
        border-radius: 8px;
    }

    .order-details h2 {
        margin-top: 0;
        margin-bottom: 1.5rem;
        font-size: 1.5rem;
    }

    .order-info {
        margin-bottom: 2rem;
    }

    .order-info-row {
        display: flex;
        justify-content: space-between;
        padding: 0.75rem 0;
        border-bottom: 1px solid #e5e7eb;
    }

    .order-info-label {
        font-weight: 600;
    }

    .order-items-container h3 {
        margin-bottom: 1rem;
        font-size: 1.25rem;
    }

    .order-items {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .order-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        background: white;
        border-radius: 6px;
        border: 1px solid #e5e7eb;
    }

    .order-item-details {
        flex: 1;
        text-align: left;
    }

    .order-item-title {
        display: block;
        font-weight: 600;
        margin-bottom: 0.25rem;
    }

    .order-item-variant {
        display: block;
        font-size: 0.875rem;
        color: #6b7280;
    }

    .order-item-quantity {
        margin: 0 1rem;
        color: #6b7280;
    }

    .order-item-price {
        font-weight: 600;
        min-width: 80px;
        text-align: right;
    }

    .order-actions {
        margin: 2rem 0;
    }

    .order-confirmation-note {
        margin-top: 2rem;
        padding: 1.5rem;
        background: #eff6ff;
        border-radius: 8px;
        font-size: 0.875rem;
        color: #1e40af;
    }

    .order-error {
        padding: 2rem;
    }

    .order-error h2 {
        margin: 1rem 0;
    }

    .order-error p {
        margin-bottom: 1rem;
    }

    .button {
        display: inline-block;
        padding: 0.75rem 1.5rem;
        background: #000;
        color: #fff;
        text-decoration: none;
        border-radius: 6px;
        font-weight: 600;
        transition: background 0.2s;
    }

    .button:hover {
        background: #333;
    }

    .button.is-primary {
        background: var(--ghost-accent-color, #000);
    }

    .button.is-primary:hover {
        opacity: 0.9;
    }
</style>

<section class="thank-you-container">
  {#snippet errorSnippet(errorMsg: string)}
      <!-- Error State -->
      <div class="order-error">
          <div class="error-icon">⚠️</div>
          <h2>Something Went Wrong</h2>
          <p class="error-message">We encountered an error processing your order.</p>
          <p>If you were charged, please contact us at <a href="mailto:{site.owner_email}">{site.owner_email}</a> with your payment confirmation.</p>
          <p>Error:</p>
          <code><pre>{errorMsg}</pre></code>
          <a href="/store" class="button is-primary">Return to Store</a>
      </div>
  {/snippet}

  {#if order === null}
    {@render errorSnippet("No checkout session found. Please contact support if you completed a payment.")}
  {:else}
    {#await order}
    <!-- Loading State -->
    <div class="order-loading">
        <div class="loading-spinner"></div>
        <p>Processing your order...</p>
    </div>
    {:catch error}
      {@render errorSnippet(error.message)}
    {:then order}
      <div class="order-success" style="display: none;">
          <div class="success-icon">✓</div>
          <h1>Thank You for Your Order!</h1>
          <p>Your order has been confirmed and will be processed shortly.</p>

          <div class="order-details">
              <h2>Order Details</h2>

              <div class="order-info">
                  <div class="order-info-row">
                      <span class="order-info-label">Order Number:</span>
                      <span class="order-id">#</span>
                  </div>
                  <div class="order-info-row">
                      <span class="order-info-label">Total:</span>
                      <span class="order-total">$0.00</span>
                  </div>
              </div>

              <div class="order-items-container">
                  <h3>Items</h3>
                  <div class="order-items">
                      <!-- Order items will be populated here by JavaScript -->
                      {#each order.items! as item}
                        <div class="order-item">
                          itemElement.className = 'order-item';
                          itemElement.innerHTML = `
                            <div class="order-item-details">
                              <span class="order-item-title">${item.title}</span>
                              ${item.variant_title ? `<span class="order-item-variant">${item.variant_title}</span>` : ''}
                            </div>
                            <div class="order-item-quantity">x${item.quantity}</div>
                            <div class="order-item-price">$${item.unit_price.toFixed(2)}</div>
                          `;
                        </div>
                      {/each}
                  </div>
              </div>
          </div>

          <div class="order-actions">
              <a href="/store" class="button is-primary">Continue Shopping</a>
          </div>

          <div class="order-confirmation-note">
              <p>A confirmation email will be sent to you shortly with your order details and tracking information.</p>
          </div>
      </div>
    {/await}
  {/if}
</section>
