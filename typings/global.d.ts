declare global {
  interface LightGalleryOptions {
    selector: string;
  }

  interface Window {
    lightGallery(element?: HTMLElement, options?: LightGalleryOptions): void;
  }
}

export {};
