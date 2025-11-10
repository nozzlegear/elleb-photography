import { configureSdk } from '../medusa/index';
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

    //this.displayOrderSuccess();
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
