<script lang="ts">
  import type { StoreOrder, StoreOrderAddress, StoreOrderLineItem } from '@medusajs/types';
  import { configureSdk } from '../medusa/index';
  import { getOrderDetails } from "../medusa/orders";
  import { getCurrentCart, getOrderIdFromCart, clearStoredCartId } from "../medusa/cart";
  import { formatPrice } from "../medusa/format-price";

  type OrderState =
    | { type: "loading" }
    | { type: "not_found" }
    | { type: "error", message: string }
    | { type: "loaded", order: StoreOrder };

  // Read config from meta tags
  const contactEmail = document.querySelector('meta[name="store-contact-email"]')?.getAttribute('content') ?? null;

  const sdk = configureSdk();

  let orderState = $state<OrderState>({ type: "loading" });
  let isRetrying = $state(false);

  // Check if an order has any physical (shippable) items
  function hasPhysicalItems(order: StoreOrder): boolean {
    return order.items?.some(item => item.requires_shipping) ?? false;
  }

  // Check if an order has any digital items
  function hasDigitalItems(order: StoreOrder): boolean {
    return order.items?.some(item => item.metadata?.is_digital === true || !item.requires_shipping) ?? false;
  }

  // Check if two addresses are different
  function addressesDiffer(addr1?: StoreOrderAddress | null, addr2?: StoreOrderAddress | null): boolean {
    if (!addr1 || !addr2) return false;
    return (
      addr1.address_1 !== addr2.address_1 ||
      addr1.address_2 !== addr2.address_2 ||
      addr1.city !== addr2.city ||
      addr1.province !== addr2.province ||
      addr1.postal_code !== addr2.postal_code ||
      addr1.country_code !== addr2.country_code
    );
  }

  // Format an address for display
  function formatAddress(address?: StoreOrderAddress | null): string[] {
    if (!address) return [];
    const lines: string[] = [];

    if (address.first_name || address.last_name) {
      lines.push([address.first_name, address.last_name].filter(Boolean).join(' '));
    }
    if (address.company) {
      lines.push(address.company);
    }
    if (address.address_1) {
      lines.push(address.address_1);
    }
    if (address.address_2) {
      lines.push(address.address_2);
    }
    const cityLine = [address.city, address.province, address.postal_code].filter(Boolean).join(', ');
    if (cityLine) {
      lines.push(cityLine);
    }
    if (address.country_code) {
      lines.push(address.country_code.toUpperCase());
    }

    return lines;
  }

  // Format date for display
  function formatDate(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Load order from the API
  async function loadOrder(orderId: string): Promise<void> {
    if (!sdk) {
      orderState = { type: "error", message: "Store configuration is missing." };
      return;
    }

    try {
      const order = await getOrderDetails(sdk, orderId);
      orderState = { type: "loaded", order };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load order details.";
      // Check if it's a 404-like error
      if (message.includes("not found") || message.includes("404")) {
        orderState = { type: "not_found" };
      } else {
        orderState = { type: "error", message };
      }
    }
  }

  // Main initialization function
  async function initialize(): Promise<void> {
    if (!sdk) {
      orderState = { type: "error", message: "Store configuration is missing." };
      return;
    }

    // First, check URL for order ID
    const urlParams = new URLSearchParams(window.location.search);
    let orderId = urlParams.get('order_id');

    if (orderId) {
      // We have an order ID in the URL, load it directly
      await loadOrder(orderId);
      return;
    }

    // No order ID in URL, check cart metadata
    try {
      const cart = await getCurrentCart(sdk);

      if (cart) {
        orderId = getOrderIdFromCart(cart);

        if (orderId) {
          // Found order ID in cart metadata
          // Update URL so refreshing works
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.set('order_id', orderId);
          window.history.replaceState({}, '', newUrl.toString());

          // Clear the cart since it's been purchased
          clearStoredCartId();

          // Dispatch cart-updated event to update cart sidebar
          window.dispatchEvent(new CustomEvent('cart-cleared'));

          // Load the order
          await loadOrder(orderId);
          return;
        }
      }

      // No order ID found anywhere
      orderState = { type: "not_found" };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to check order status.";
      orderState = { type: "error", message };
    }
  }

  // Retry loading the order
  async function handleRetry(): Promise<void> {
    isRetrying = true;
    orderState = { type: "loading" };
    await initialize();
    isRetrying = false;
  }

  // Run initialization
  initialize();
</script>

<style>
    .order-page {
        max-width: 800px;
        margin: 0 auto;
        padding: 2rem;
    }

    .order-loading {
        text-align: center;
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

    .order-success {
        text-align: center;
    }

    .success-icon {
        width: 80px;
        height: 80px;
        background: #10b981;
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2.5rem;
        font-weight: bold;
        margin: 0 auto 1.5rem;
    }

    .order-success h1 {
        margin-bottom: 0.5rem;
        font-size: 2rem;
    }

    .order-success > p {
        color: #6b7280;
        margin-bottom: 2rem;
    }

    .order-details {
        margin: 2rem 0;
        text-align: left;
        background: #f9fafb;
        padding: 2rem;
        border-radius: 8px;
    }

    .order-details h2 {
        margin-top: 0;
        margin-bottom: 1.5rem;
        font-size: 1.5rem;
        border-bottom: 1px solid #e5e7eb;
        padding-bottom: 0.75rem;
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

    .order-info-row:last-child {
        border-bottom: none;
    }

    .order-info-label {
        font-weight: 600;
        color: #374151;
    }

    .order-info-value {
        color: #1f2937;
    }

    .order-items-container {
        margin-bottom: 2rem;
    }

    .order-items-container h3 {
        margin-bottom: 1rem;
        font-size: 1.125rem;
        color: #374151;
    }

    .order-items {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .order-item {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        background: white;
        border-radius: 6px;
        border: 1px solid #e5e7eb;
    }

    .order-item-image {
        width: 60px;
        height: 60px;
        flex-shrink: 0;
        border-radius: 4px;
        overflow: hidden;
        background: #f3f4f6;
    }

    .order-item-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .order-item-details {
        flex: 1;
        min-width: 0;
    }

    .order-item-title {
        font-weight: 600;
        margin-bottom: 0.25rem;
        color: #1f2937;
    }

    .order-item-variant {
        font-size: 0.875rem;
        color: #6b7280;
    }

    .order-item-badge {
        display: inline-block;
        font-size: 0.75rem;
        padding: 0.125rem 0.5rem;
        border-radius: 9999px;
        margin-left: 0.5rem;
    }

    .badge-digital {
        background: #dbeafe;
        color: #1e40af;
    }

    .badge-physical {
        background: #fef3c7;
        color: #92400e;
    }

    .order-item-quantity {
        color: #6b7280;
        font-size: 0.875rem;
    }

    .order-item-price {
        font-weight: 600;
        text-align: right;
        min-width: 80px;
    }

    .order-addresses {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1.5rem;
        margin-bottom: 2rem;
    }

    .address-block h3 {
        margin-bottom: 0.75rem;
        font-size: 1rem;
        color: #374151;
    }

    .address-lines {
        font-size: 0.875rem;
        color: #4b5563;
        line-height: 1.6;
    }

    .order-summary {
        margin-top: 1rem;
    }

    .order-summary-row {
        display: flex;
        justify-content: space-between;
        padding: 0.5rem 0;
        color: #6b7280;
    }

    .order-total {
        display: flex;
        justify-content: space-between;
        padding-top: 1rem;
        margin-top: 0.5rem;
        border-top: 2px solid #e5e7eb;
        font-size: 1.25rem;
        font-weight: 700;
    }

    .order-confirmation-note {
        margin-top: 2rem;
        padding: 1.5rem;
        background: #eff6ff;
        border-radius: 8px;
        text-align: left;
    }

    .order-confirmation-note h4 {
        margin-top: 0;
        margin-bottom: 0.75rem;
        font-size: 1rem;
        color: #1e40af;
    }

    .order-confirmation-note p {
        font-size: 0.875rem;
        color: #1e40af;
        margin: 0.5rem 0;
    }

    .order-confirmation-note p:last-child {
        margin-bottom: 0;
    }

    .digital-note {
        background: #f0fdf4;
        margin-top: 1rem;
    }

    .digital-note h4,
    .digital-note p {
        color: #166534;
    }

    .order-actions {
        margin: 2rem 0;
        display: flex;
        gap: 1rem;
        justify-content: center;
    }

    .order-error,
    .order-not-found {
        text-align: center;
        padding: 4rem 2rem;
    }

    .error-icon,
    .warning-icon {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2.5rem;
        margin: 0 auto 1.5rem;
    }

    .error-icon {
        background: #fee2e2;
        color: #dc2626;
    }

    .warning-icon {
        background: #fef3c7;
        color: #d97706;
    }

    .order-error h2,
    .order-not-found h2 {
        margin-bottom: 1rem;
        font-size: 1.5rem;
    }

    .order-error p,
    .order-not-found p {
        color: #6b7280;
        margin-bottom: 1rem;
    }

    .error-code {
        background: #f3f4f6;
        padding: 1rem;
        border-radius: 6px;
        font-family: monospace;
        font-size: 0.875rem;
        margin: 1rem 0;
        word-break: break-word;
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
        border: none;
        cursor: pointer;
        font-size: 1rem;
    }

    .button:hover {
        background: #333;
    }

    .button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .button.is-primary {
        background: var(--ghost-accent-color, #000);
    }

    .button.is-primary:hover {
        opacity: 0.9;
    }

    .button.is-secondary {
        background: transparent;
        color: #374151;
        border: 1px solid #d1d5db;
    }

    .button.is-secondary:hover {
        background: #f9fafb;
    }

    .contact-info {
        margin-top: 1.5rem;
        padding-top: 1.5rem;
        border-top: 1px solid #e5e7eb;
    }

    .contact-info h4 {
        margin-bottom: 0.5rem;
        font-size: 1rem;
        color: #374151;
    }

    .contact-info p {
        font-size: 0.875rem;
        color: #6b7280;
    }

    .contact-info a {
        color: var(--ghost-accent-color, #2563eb);
    }
</style>

<section class="order-page">
  {#if orderState.type === "loading"}
    <div class="order-loading">
      <div class="loading-spinner"></div>
      <p>Loading your order details...</p>
    </div>
  {:else if orderState.type === "not_found"}
    <div class="order-not-found">
      <div class="warning-icon">?</div>
      <h2>Order Not Found</h2>
      <p>We couldn't find your order. This could mean:</p>
      <ul style="text-align: left; max-width: 400px; margin: 1rem auto;">
        <li>Your order is still being processed (this can take a moment)</li>
        <li>The order link is incorrect or has expired</li>
        <li>There was an issue with the checkout</li>
      </ul>
      <p>If you completed a payment, please wait a moment and try again.</p>
      <div class="order-actions">
        <button class="button is-primary" onclick={handleRetry} disabled={isRetrying}>
          {#if isRetrying}
            Checking...
          {:else}
            Check Again
          {/if}
        </button>
        <a href="/store" class="button is-secondary">Return to Store</a>
      </div>
      {#if contactEmail}
        <div class="contact-info">
          <h4>Need Help?</h4>
          <p>If you believe this is an error, please contact us at <a href="mailto:{contactEmail}">{contactEmail}</a> with your payment confirmation.</p>
        </div>
      {/if}
    </div>
  {:else if orderState.type === "error"}
    <div class="order-error">
      <div class="error-icon">!</div>
      <h2>Something Went Wrong</h2>
      <p>We encountered an error while loading your order.</p>
      <div class="error-code">{orderState.message}</div>
      <div class="order-actions">
        <button class="button is-primary" onclick={handleRetry} disabled={isRetrying}>
          {#if isRetrying}
            Retrying...
          {:else}
            Try Again
          {/if}
        </button>
        <a href="/store" class="button is-secondary">Return to Store</a>
      </div>
      {#if contactEmail}
        <div class="contact-info">
          <h4>Need Help?</h4>
          <p>If you were charged, please contact us at <a href="mailto:{contactEmail}">{contactEmail}</a> with your payment confirmation and we'll help resolve this.</p>
        </div>
      {/if}
    </div>
  {:else}
    {@const order = orderState.order}
    {@const showShipping = hasPhysicalItems(order)}
    {@const showDigitalNote = hasDigitalItems(order)}
    {@const showBilling = addressesDiffer(order.shipping_address, order.billing_address)}

    <div class="order-success">
      <div class="success-icon">&#10003;</div>
      <h1>Thank You for Your Order!</h1>
      <p>Your order has been confirmed and will be processed shortly.</p>

      <div class="order-details">
        <h2>Order Details</h2>

        <div class="order-info">
          <div class="order-info-row">
            <span class="order-info-label">Order Number</span>
            <span class="order-info-value">#{order.display_id ?? order.id}</span>
          </div>
          <div class="order-info-row">
            <span class="order-info-label">Date</span>
            <span class="order-info-value">{formatDate(order.created_at)}</span>
          </div>
          {#if order.email}
            <div class="order-info-row">
              <span class="order-info-label">Email</span>
              <span class="order-info-value">{order.email}</span>
            </div>
          {/if}
        </div>

        <div class="order-items-container">
          <h3>Items</h3>
          <div class="order-items">
            {#each order.items ?? [] as item (item.id)}
              {@const isDigital = item.metadata?.is_digital === true || !item.requires_shipping}
              <div class="order-item">
                <div class="order-item-image">
                  {#if item.thumbnail}
                    <img src={item.thumbnail} alt={item.title} />
                  {:else}
                    <div style="width: 100%; height: 100%; background: #e5e7eb;"></div>
                  {/if}
                </div>
                <div class="order-item-details">
                  <div class="order-item-title">
                    {item.product_title ?? item.title}
                    {#if isDigital}
                      <span class="order-item-badge badge-digital">Digital</span>
                    {:else}
                      <span class="order-item-badge badge-physical">Physical</span>
                    {/if}
                  </div>
                  {#if !isDigital && item.variant_title}
                    <div class="order-item-variant">{item.variant_title}</div>
                  {/if}
                </div>
                <div class="order-item-quantity">x{item.quantity}</div>
                <div class="order-item-price">{formatPrice(item.total, order.currency_code)}</div>
              </div>
            {/each}
          </div>
        </div>

        {#if showShipping || showBilling}
          <div class="order-addresses">
            {#if showShipping && order.shipping_address}
              <div class="address-block">
                <h3>Shipping Address</h3>
                <div class="address-lines">
                  {#each formatAddress(order.shipping_address) as line}
                    <div>{line}</div>
                  {/each}
                </div>
              </div>
            {/if}
            {#if showBilling && order.billing_address}
              <div class="address-block">
                <h3>Billing Address</h3>
                <div class="address-lines">
                  {#each formatAddress(order.billing_address) as line}
                    <div>{line}</div>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        {/if}

        <div class="order-summary">
          <div class="order-summary-row">
            <span>Subtotal</span>
            <span>{formatPrice(order.subtotal, order.currency_code)}</span>
          </div>
          {#if showShipping}
            <div class="order-summary-row">
              <span>Shipping</span>
              <span>{formatPrice(order.shipping_total ?? 0, order.currency_code)}</span>
            </div>
          {/if}
          <div class="order-summary-row">
            <span>Tax</span>
            <span>{formatPrice(order.tax_total ?? 0, order.currency_code)}</span>
          </div>
          <div class="order-total">
            <span>Total</span>
            <span>{formatPrice(order.total, order.currency_code)}</span>
          </div>
        </div>
      </div>

      <div class="order-confirmation-note">
        <h4>What's Next?</h4>
        <p>A confirmation email has been sent to {order.email ?? "your email address"} with your order details.</p>
        {#if showShipping}
          <p>Your physical items will be shipped soon. You'll receive tracking information once your order ships.</p>
        {/if}
      </div>

      {#if showDigitalNote}
        <div class="order-confirmation-note digital-note">
          <h4>Digital Downloads</h4>
          <p>Your digital items will be delivered via email shortly. Please check your inbox (and spam folder) for download links.</p>
        </div>
      {/if}

      <div class="order-actions">
        <a href="/store" class="button is-primary">Continue Shopping</a>
      </div>

      {#if contactEmail}
        <div class="contact-info">
          <h4>Questions About Your Order?</h4>
          <p>Contact us at <a href="mailto:{contactEmail}">{contactEmail}</a> and include your order number #{order.display_id ?? order.id}.</p>
        </div>
      {/if}
    </div>
  {/if}
</section>
