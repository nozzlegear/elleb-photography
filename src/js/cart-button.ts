import { configureSdk } from './medusa/index';
import { createOrRetrieveCartId, getCart, setItemQuantity } from './medusa/cart';
import type { StoreCart, StoreCartLineItem } from '@medusajs/types';

class CartButton {
  private sdk = configureSdk();
  private cartId: string | null = null;
  private cart: StoreCart | null = null;
  private button: HTMLElement | null = null;
  private countElements: NodeListOf<HTMLElement> | null = null;
  private sidebarElements = {
    cartEmpty: null as HTMLElement | null,
    cartList: null as HTMLElement | null,
    totalAmount: null as HTMLElement | null,
    checkoutButton: null as HTMLElement | null,
  };

  constructor() {
    this.init();
  }

  private async init() {
    if (!this.sdk) return;

    this.button = document.querySelector('.cart-button');
    this.countElements = document.querySelectorAll('.cart-count');
    
    // Get sidebar elements
    this.sidebarElements.cartEmpty = document.querySelector('.cart-empty');
    this.sidebarElements.cartList = document.querySelector('.cart-list');
    this.sidebarElements.totalAmount = document.querySelector('.cart-total-amount');
    this.sidebarElements.checkoutButton = document.querySelector('.checkout-button');

    if (!this.button) return;

    await this.loadCart();
    this.attachEvents();
    this.updateDisplay();
  }

  private async loadCart() {
    if (!this.sdk) return;
    
    try {
      this.cartId = await createOrRetrieveCartId(this.sdk);
      this.cart = await getCart(this.sdk, this.cartId);
    } catch (error) {
      console.error('Failed to load cart:', error);
    }
  }

  private attachEvents() {
    if (!this.button) return;

    this.button.addEventListener('click', (e) => {
      e.preventDefault();
      this.openSidebar();
    });

    window.addEventListener('cart-updated', () => {
      this.refreshCart();
    });

    // Checkout button event
    if (this.sidebarElements.checkoutButton) {
      this.sidebarElements.checkoutButton.addEventListener('click', () => {
        this.handleCheckout();
      });
    }
  }

  private openSidebar() {
    document.body.classList.add('has-sidenav');
    this.updateSidebarDisplay();
  }

  private updateDisplay() {
    if (!this.cart || !this.countElements) return;

    const itemCount = this.getItemCount();
    
    this.countElements.forEach(element => {
      element.textContent = itemCount.toString();
    });

    if (this.button) {
      this.button.classList.toggle('cart-button--empty', itemCount === 0);
    }

    this.updateSidebarDisplay();
  }

  private updateSidebarDisplay() {
    if (!this.cart) return;

    const itemCount = this.getItemCount();
    const isEmpty = itemCount === 0;

    // Show/hide empty state
    if (this.sidebarElements.cartEmpty) {
      this.sidebarElements.cartEmpty.style.display = isEmpty ? 'block' : 'none';
    }

    // Show/hide cart list
    if (this.sidebarElements.cartList) {
      this.sidebarElements.cartList.style.display = isEmpty ? 'none' : 'block';
      
      if (!isEmpty) {
        this.renderCartItems();
      }
    }

    // Update total
    if (this.sidebarElements.totalAmount) {
      this.sidebarElements.totalAmount.textContent = this.getCartTotal();
    }

    // Show/hide checkout button
    if (this.sidebarElements.checkoutButton) {
      this.sidebarElements.checkoutButton.style.display = isEmpty ? 'none' : 'block';
    }
  }

  private renderCartItems() {
    if (!this.cart?.items || !this.sidebarElements.cartList) return;

    // Clear existing items
    this.sidebarElements.cartList.innerHTML = '';

    // Render each cart item using the template
    this.cart.items.forEach(item => {
      const itemElement = this.createCartItemElement(item);
      this.sidebarElements.cartList.appendChild(itemElement);
    });

    // Attach event listeners to quantity controls
    this.sidebarElements.cartList.querySelectorAll('.quantity-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.handleQuantityChange(e));
    });
  }

  private createCartItemElement(item: StoreCartLineItem): HTMLElement {
    const template = document.getElementById('cart-item-template') as HTMLTemplateElement;
    if (!template) {
      throw new Error('Cart item template not found');
    }

    const clone = template.content.cloneNode(true) as DocumentFragment;
    const cartItemElement = clone.querySelector('.cart-item') as HTMLElement;

    // Extract product data
    const product = item.variant?.product;
    const variant = item.variant;
    const thumbnail = product?.thumbnail || '/assets/img/placeholder.jpg';
    const title = product?.title || 'Product';
    const variantTitle = variant?.title && variant.title !== 'Default Title' ? variant.title : '';
    const price = variant?.calculated_price?.calculated_amount
      ? variant.calculated_price.calculated_amount.toFixed(2)
      : '0.00';

    // Set line item ID
    cartItemElement.dataset.lineItemId = item.id;

    // Populate image
    const imageEl = clone.querySelector('.cart-item-image img') as HTMLImageElement;
    if (imageEl) {
      imageEl.src = thumbnail;
      imageEl.alt = title;
    }

    // Populate title
    const titleEl = clone.querySelector('.cart-item-title') as HTMLElement;
    if (titleEl) {
      titleEl.textContent = title;
    }

    // Populate variant title
    const variantEl = clone.querySelector('.cart-item-variant') as HTMLElement;
    if (variantEl && variantTitle) {
      variantEl.textContent = variantTitle;
      variantEl.style.display = 'block';
    }

    // Populate price
    const priceEl = clone.querySelector('.cart-item-price') as HTMLElement;
    if (priceEl) {
      priceEl.textContent = `$${price}`;
    }

    // Populate quantity
    const quantityEl = clone.querySelector('.quantity-display') as HTMLElement;
    if (quantityEl) {
      quantityEl.textContent = item.quantity.toString();
    }

    // Set data attributes on quantity buttons
    const decreaseBtn = clone.querySelector('.quantity-decrease') as HTMLElement;
    const increaseBtn = clone.querySelector('.quantity-increase') as HTMLElement;
    if (decreaseBtn) {
      decreaseBtn.dataset.lineItemId = item.id;
    }
    if (increaseBtn) {
      increaseBtn.dataset.lineItemId = item.id;
    }

    return cartItemElement;
  }

  private async handleQuantityChange(e: Event) {
    if (!this.sdk || !this.cartId) return;

    const target = e.target as HTMLElement;
    const action = target.dataset.action;
    const lineItemId = target.dataset.lineItemId;

    if (!action || !lineItemId) return;

    const currentItem = this.cart?.items?.find(item => item.id === lineItemId);
    if (!currentItem) return;

    let newQuantity = currentItem.quantity;
    
    if (action === 'increase') {
      newQuantity += 1;
    } else if (action === 'decrease') {
      newQuantity = Math.max(0, newQuantity - 1);
    }

    try {
      this.cart = await setItemQuantity(this.sdk, this.cartId, lineItemId, newQuantity);
      this.updateDisplay();
      
      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('cart-updated', { detail: this.cart }));
    } catch (error) {
      console.error('Failed to update item quantity:', error);
    }
  }

  private handleCheckout() {
    // TODO: Implement checkout redirect or modal
    console.log('Checkout clicked - implement checkout flow');
    alert('Checkout functionality would redirect to payment page');
  }

  private async refreshCart() {
    if (!this.sdk || !this.cartId) return;

    try {
      this.cart = await getCart(this.sdk, this.cartId);
      this.updateDisplay();
    } catch (error) {
      console.error('Failed to refresh cart:', error);
    }
  }

  public getItemCount(): number {
    return this.cart?.items?.reduce((total, item) => total + item.quantity, 0) || 0;
  }

  public getCartTotal(): string {
    if (!this.cart?.total) return '0.00';
    return this.cart.total.toFixed(2);
  }
}

// Initialize cart
new CartButton();