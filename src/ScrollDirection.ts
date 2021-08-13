/**
 * ScrollDirection - a class to handle scroll direction classes on body
 *
 * Author: Bogdan Barbu
 * Team: Codingheads (codingheads.com)
 */

interface ScrollDirectionOptions {
  onlyFor?: () => boolean | null;
  threshold?: number;
}

export class ScrollDirection {
  #onlyForCallback: () => boolean | null = null;
  #lastScrollTop: number = 0;
  #threshold: number = 0;

  /**
   * start an instance
   * @param {{onlyFor: a callback to determine where to modify classes; threshold: amount in px to take into account }} param0
   */
  constructor({ onlyFor = null, threshold = 0 }: ScrollDirectionOptions = {}) {
    this.#onlyForCallback = onlyFor;
    this.#threshold = threshold;
    this.#lastScrollTop = window.pageYOffset || document.documentElement.scrollTop;

    this.#setupListeners();
  }

  /**
   * setup the scroll event listener
   */
  #setupListeners() {
    window.addEventListener('scroll', () => {
      const isValid = !this.#onlyForCallback || this.#onlyForCallback();
      if (isValid) {
        this.#determineDirection();
      }
    });
  }

  /**
   * dispatch an event on the window
   */
  #dispatchEvent(name: string) {
    requestAnimationFrame(() => {
      window.dispatchEvent(new CustomEvent(name));
    });
  }

  /**
   * determine the scroll direction
   */
  #determineDirection() {
    const body = document.body,
      classList = body.classList;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const localThreshold = scrollTop > this.#threshold * 2 ? this.#threshold : 10;
    if (Math.abs(scrollTop - this.#lastScrollTop) < localThreshold) return;

    if (
      scrollTop > this.#lastScrollTop + localThreshold &&
      !classList.contains('scrolling-down')
    ) {
      classList.add('scrolling-down');
      classList.remove('scrolling-up');
      this.#dispatchEvent('scrollDirectionChange');
    } else if (
      scrollTop < this.#lastScrollTop - localThreshold &&
      !classList.contains('scrolling-up')
    ) {
      classList.add('scrolling-up');
      classList.remove('scrolling-down');
      this.#dispatchEvent('scrollDirectionChange');
    }

    this.#lastScrollTop = Math.max(scrollTop, 0);
  }
}

export default ScrollDirection;
