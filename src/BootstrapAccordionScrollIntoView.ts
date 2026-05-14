import { scrollWithMarginTop } from './scrollWithMarginTop';
import { onComplete } from './utils/onReady';

/**
 * Scroll to the opened accordion tab
 */
export class BootstrapAccordionScrollIntoView {
  extraOffset: number;

  constructor({ extraOffset = 0 } = {}) {
    this.extraOffset = extraOffset;
    onComplete(() => setTimeout(() => this.#addEventListeners(), 1000));
  }

  #addEventListeners() {
    document.addEventListener('shown.bs.collapse', (e: Event) => {
      this.#handle(e);
    });
  }

  #handle = (e: Event) => {
    let header: HTMLElement = null;
    const target = e.target as unknown as HTMLElement;

    // Skip scrolling if the clicked element or any of its parents has the class 'skip-scroll-into-view'.
    if (target.closest?.('.skip-scroll-into-view, [data-skip-scroll-into-view]')) {
      return;
    }

    const tabId = target.id;
    const headerId = target.getAttribute('aria-labelledby');
    if (headerId) {
      header = document.querySelector(`#${headerId}`);
    }
    if (!header && tabId) {
      header = document.querySelector(`[data-bs-target="#${tabId}"]`);
    }

    if (header) {
      scrollWithMarginTop(header, this.extraOffset, true);
    }
  };
}

export default BootstrapAccordionScrollIntoView;
