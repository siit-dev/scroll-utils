import { scrollWithMarginTop } from './scrollWithMarginTop';

/**
 * Fix the scroll offset when loading a page with a #hash (anchor)
 */
export class FixHashScrollPosition {
  constructor() {
    // fix for scroll-margin-top
    window.addEventListener(
      'hashchange',
      () => {
        const hash = window.location.hash;
        const element = document.querySelector(hash) as HTMLElement;
        if (element) {
          setTimeout(() => scrollWithMarginTop(element));
        }
      },
      false
    );
  }
}

export default FixHashScrollPosition;
