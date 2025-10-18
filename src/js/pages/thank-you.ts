import { configureSdk } from '../medusa/index';
import { completeCart } from '../medusa/checkout';
import type { StoreOrder, StoreCart } from '@medusajs/types';

class ThankYouPage {
  private sdk = configureSdk();
  private orderIdElement: HTMLElement | null = null;
  private orderTotalElement: HTMLElement | null = null;
  private orderItemsElement: HTMLElement | null = null;
  private loadingElement: HTMLElement | null = null;
  private errorElement: HTMLElement | null = null;
  private successElement: HTMLElement | null = null;

  constructor() {
    this.init();
  }

  private async init() {
    if (!this.sdk) {
      console.error('Medusa SDK not configured');
      return;
    }

    // Get page elements
    this.orderIdElement = document.querySelector('.order-id');
    this.orderTotalElement = document.querySelector('.order-total');
    this.orderItemsElement = document.querySelector('.order-items');
    this.loadingElement = document.querySelector('.order-loading');
    this.errorElement = document.querySelector('.order-error');
    this.successElement = document.querySelector('.order-success');

    // Get session ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');

    if (!sessionId) {
      this.showError('No checkout session found. Please contact support if you completed a payment.');
      return;
    }

    // Complete the order
    await this.completeOrder();
  }

  private async completeOrder() {
    this.showLoading();

    try {
      // Get the cart ID from localStorage
      const cartId = localStorage.getItem('MEDUSA_CART_TOKEN');

      if (!cartId) {
        // Cart has already been cleared (order was already completed)
        // Try to retrieve order from session storage as fallback
        const cachedOrder = sessionStorage.getItem('COMPLETED_ORDER');
        if (cachedOrder) {
          const order = JSON.parse(cachedOrder);
          this.displayOrderSuccess(order);
          return;
        }

        this.showError('Order information not found. Please check your email for order confirmation or contact support.');
        return;
      }

      // Complete the cart to create an order
      const result = await completeCart(this.sdk!, cartId);

      if (result.type === 'order' && result.order) {
        // Order was successfully created (or already existed)
        const order = result.order;

        // Cache the order in session storage for page refreshes
        sessionStorage.setItem('COMPLETED_ORDER', JSON.stringify(order));

        this.displayOrderSuccess(order);

        // Clear the cart from localStorage so a new one will be created
        localStorage.removeItem('MEDUSA_CART_TOKEN');
      } else if (result.type === 'cart') {
        // Cart completion failed - Medusa returned an error
        // The error details are in result.error
        console.error('Cart completion error:', result.error);
        this.showError('Failed to complete your order. Please contact support with your payment confirmation.');
      }
    } catch (error: unknown) {
      console.error('Failed to complete order:', error);

      // Handle specific error cases
      const errorWithMessage = error as { message?: string };
      if (errorWithMessage?.message?.includes('already completed') || errorWithMessage?.message?.includes('409')) {
        // Cart was already completed (likely by webhook or previous page load)
        const cachedOrder = sessionStorage.getItem('COMPLETED_ORDER');
        if (cachedOrder) {
          const order = JSON.parse(cachedOrder);
          this.displayOrderSuccess(order);
          localStorage.removeItem('MEDUSA_CART_TOKEN');
          return;
        }

        this.showError('Your order has been processed. Please check your email for confirmation or contact support if you need assistance.');
      } else {
        this.showError('An error occurred while processing your order. Please contact support with your payment confirmation.');
      }
    }
  }

  private displayOrderSuccess(order: StoreOrder | StoreCart) {
    this.hideLoading();
    this.hideError();

    if (this.successElement) {
      this.successElement.style.display = 'block';
    }

    // Display order ID
    if (this.orderIdElement && order.id) {
      const displayId = 'display_id' in order ? order.display_id : order.id;
      this.orderIdElement.textContent = String(displayId || order.id);
    }

    // Display order total
    if (this.orderTotalElement && order.total) {
      this.orderTotalElement.textContent = `$${order.total.toFixed(2)}`;
    }

    // Display order items
    if (this.orderItemsElement && 'items' in order && order.items) {
      this.orderItemsElement.innerHTML = '';
      order.items.forEach((item) => {
        const itemElement = document.createElement('div');
        itemElement.className = 'order-item';
        itemElement.innerHTML = `
          <div class="order-item-details">
            <span class="order-item-title">${item.title}</span>
            ${item.variant_title ? `<span class="order-item-variant">${item.variant_title}</span>` : ''}
          </div>
          <div class="order-item-quantity">x${item.quantity}</div>
          <div class="order-item-price">$${item.unit_price.toFixed(2)}</div>
        `;
        this.orderItemsElement!.appendChild(itemElement);
      });
    }
  }

  private showLoading() {
    if (this.loadingElement) {
      this.loadingElement.style.display = 'block';
    }
    if (this.successElement) {
      this.successElement.style.display = 'none';
    }
    if (this.errorElement) {
      this.errorElement.style.display = 'none';
    }
  }

  private hideLoading() {
    if (this.loadingElement) {
      this.loadingElement.style.display = 'none';
    }
  }

  private showError(message: string) {
    this.hideLoading();

    if (this.errorElement) {
      this.errorElement.style.display = 'block';
      const errorMessageElement = this.errorElement.querySelector('.error-message');
      if (errorMessageElement) {
        errorMessageElement.textContent = message;
      }
    }

    if (this.successElement) {
      this.successElement.style.display = 'none';
    }
  }

  private hideError() {
    if (this.errorElement) {
      this.errorElement.style.display = 'none';
    }
  }
}

// Initialize thank you page
new ThankYouPage();
