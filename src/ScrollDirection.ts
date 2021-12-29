import isFunction from 'lodash/isFunction';
import throttle from 'lodash/throttle';

/**
 * ScrollDirection - a class to handle scroll direction classes on body
 *
 * Author: Bogdan Barbu
 * Team: Codingheads (codingheads.com)
 */

interface ScrollDirectionOptions {
  onlyFor?: () => boolean | null;
  threshold?: number;
  thresholdCallback?: Function | null;
  throttle?: null | number;
  throttleRunTrailing?: boolean;
}

export class ScrollDirection {
  onlyForCallback: () => boolean | null = null;
  #lastScrollTop: number = 0;
  threshold: number = 0;
  thresholdCallback?: Function | null = null;
  #throttle?: null | number;
  #throttleRunTrailing: boolean;

  /**
   * start an instance
   * @param {{onlyFor: a callback to determine where to modify classes; threshold: amount in px to take into account }} param0
   */
  constructor({
    onlyFor = null,
    threshold = 0,
    thresholdCallback = null,
    throttle = 16,
    throttleRunTrailing = false,
  }: ScrollDirectionOptions = {}) {
    this.onlyForCallback = onlyFor;
    this.threshold = threshold;
    this.thresholdCallback = thresholdCallback;
    this.#throttle = throttle;
    this.#throttleRunTrailing = throttleRunTrailing;
    this.#lastScrollTop = window.pageYOffset || document.documentElement.scrollTop;

    this.#setupListeners();
  }

  /**
   * setup the scroll event listener
   */
  #setupListeners() {
    const update = () => {
      const isValid = !this.onlyForCallback || this.onlyForCallback();
      if (!isValid) return;
      this.#determineDirection();
    };
    if (this.#throttle) {
      const throttledUpdate = throttle(update, this.#throttle, {
        trailing: this.#throttleRunTrailing,
      });
      window.addEventListener('scroll', throttledUpdate);
    } else {
      window.addEventListener('scroll', update);
    }
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
    const localThreshold =
      this.thresholdCallback && isFunction(this.thresholdCallback)
        ? this.thresholdCallback({
            scrollTop,
            threshold: this.threshold,
            lastScrollTop: this.#lastScrollTop,
          })
        : this.threshold;
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
