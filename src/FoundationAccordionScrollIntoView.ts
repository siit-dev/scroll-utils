import { scrollWithMarginTop } from './scrollWithMarginTop';
import { onComplete } from './utils/onReady';

/**
 * Scroll to the opened accordion tab
 */
export class FoundationAccordionScrollIntoView {
  extraOffset: number;

  constructor({ extraOffset = 0 } = {}) {
    this.extraOffset = extraOffset;
    onComplete(() => setTimeout(() => this.#addEventListeners(), 1000));
  }

  #addEventListeners() {
    if (!('$' in window)) return;

    (window as any).$(document).on('down.zf.accordion', (e, $content) => {
      const target = $content.get(0).parentNode;

      // Skip scrolling if the clicked element or any of its parents has the class 'skip-scroll-into-view'.
      if (target.closest?.('.skip-scroll-into-view')) {
        return;
      }

      scrollWithMarginTop(target, this.extraOffset, true);
    });
  }
}

export default FoundationAccordionScrollIntoView;
