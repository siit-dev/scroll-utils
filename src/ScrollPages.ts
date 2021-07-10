/**
 * ScrollPages - a class to add classes to the body,
 * detecting whether we are above the fold or below
 * (the above-the-fold are can also be set as an existing element)
 *
 * Author: Bogdan Barbu
 * Team: Codingheads (codingheads.com)
 */

interface ScrollPagesOptions {
  intersectionElement?: HTMLElement;
  belowTheFoldClass?: string;
  aboveTheFoldClass?: string;
}

export default class ScrollPages {
  #intersectionElement: HTMLElement;
  #observer: IntersectionObserver = null;
  #isBelowTheFold: boolean = false;
  #belowTheFoldClass: string;
  #aboveTheFoldClass: string;

  /**
   * start an instance
   */
  constructor({
    intersectionElement = null,
    belowTheFoldClass = 'below-the-fold',
    aboveTheFoldClass = 'above-the-fold',
  }: ScrollPagesOptions = {}) {
    this.#intersectionElement = intersectionElement;
    this.#belowTheFoldClass = belowTheFoldClass;
    this.#aboveTheFoldClass = aboveTheFoldClass;
    this.#setupObserver();
  }

  /**
   * dispatch an event on the window
   */
  #dispatchEvent(name: string) {
    requestAnimationFrame(() => {
      window.dispatchEvent(new CustomEvent(name));
    });
  }

  #setupObserver() {
    const body = document.body;

    // create the intersection element, if it doesn't exist
    if (!this.#intersectionElement) {
      let containerPosition = window.getComputedStyle(body).getPropertyValue('position');
      if (!containerPosition || containerPosition == 'static') {
        body.style.position = 'relative';
      }
      this.#intersectionElement = document.createElement('div');
      this.#intersectionElement.classList.add('second-page-observer');
      this.#intersectionElement.style.cssText =
        'pointerEvents: none; visibility: hidden; position: absolute; top: 0; left: 0; right: 0; height: 100vh;';
      body.appendChild(this.#intersectionElement);
    }
    body.classList.add(this.#aboveTheFoldClass);

    this.#observer = new IntersectionObserver(entries => {
      let isFirstPage = true;
      entries.forEach(entry => {
        if (!entry.isIntersecting) {
          isFirstPage = false;
        }
      });
      if (this.#isBelowTheFold != !isFirstPage) {
        this.#isBelowTheFold = !isFirstPage;
        body.classList[this.#isBelowTheFold ? 'add' : 'remove'](this.#belowTheFoldClass);
        body.classList[!this.#isBelowTheFold ? 'add' : 'remove'](this.#aboveTheFoldClass);
        this.#dispatchEvent('ScrollPageChange');
      }
    });
    this.#observer.observe(this.#intersectionElement);
  }
}
