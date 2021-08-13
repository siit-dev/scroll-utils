import { scrollWithMarginTop } from './scrollWithMarginTop';
import { onComplete } from './utils/onReady';

/**
 * Scroll to the opened accordion tab
 */
export class BootstrapAccordionScrollIntoView {
  extraOffset: number;

  constructor({ extraOffset = 0 }) {
    this.extraOffset = extraOffset;
    onComplete(() => setTimeout(() => this.#addEventListeners(), 1000));
  }

  #addEventListeners() {
    if ('$' in window) {
      (window as any).$(document).on('shown.bs.collapse', (e: Event) => {
        this.#handle(e);
      });
    } else {
      document.addEventListener('shown.bs.collapse', (e: Event) => {
        this.#handle(e);
      });
    }
  }

  #handle = (e: Event) => {
    let header: HTMLElement = null;
    const target = e.target as unknown as HTMLElement;
    const tabId = target.id;
    const headerId = target.getAttribute('aria-labelledby');
    if (headerId) {
      header = document.querySelector(`#${headerId}`);
    }
    if (!header && tabId) {
      header = document.querySelector(`[data-target="#${tabId}"]`);
    }

    if (header) {
      scrollWithMarginTop(header, this.extraOffset);
    }
  };
}

export default BootstrapAccordionScrollIntoView;
