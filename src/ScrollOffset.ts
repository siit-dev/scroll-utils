import debounce from 'lodash/debounce';
import isFunction from 'lodash/isFunction';

export type ScrollOffsetPartSettings = {
  name?: string;
  selectors?: string[];
  elements?: (HTMLElement | null | undefined)[];
  fixedHeight?: number | false;
  condition?: Function | false;
  resizeCondition?: Function | false;
};

export type ScrollOffsetVariable<TPartName extends string = string> = {
  name: string;
  offsetParts: Array<NoInfer<TPartName> | ScrollOffsetPart>;
};

export type ScrollOffsetMap<TPartName extends string = string> = {
  [key: string]: Array<NoInfer<TPartName> | ScrollOffsetPart>;
};

export type ScrollOffsetSettings<TPartName extends string = string> = {
  offsetParts?: (ScrollOffsetPart | (Omit<ScrollOffsetPartSettings, 'name'> & { name?: TPartName }))[];
  variables?: ScrollOffsetVariable<TPartName>[] | ScrollOffsetMap<TPartName>;
  extraEvents?: string[];
  registerForHoudini?: boolean;
  useResizeObserver?: boolean;
};

export class ScrollOffsetPart {
  #name: string;
  #selectors: string[];
  #elements: (HTMLElement | null | undefined)[];
  #fixedHeight: number | false;
  #condition: Function | false;
  #resizeCondition: Function | false;

  #resizeConditionValue: boolean;
  #totalHeight: number = 0;
  #isValid: boolean = false;
  #heightCache = new WeakMap<HTMLElement, number>();

  constructor({
    name = '',
    selectors = [],
    elements = [],
    fixedHeight = false,
    condition = false,
    resizeCondition = false,
  }: ScrollOffsetPartSettings) {
    this.#name = name;
    this.#selectors = (selectors || []).filter(Boolean);
    this.#elements = elements || [];
    this.#fixedHeight = fixedHeight;
    this.#condition = condition;
    this.#resizeCondition = resizeCondition;

    this.#selectors.forEach(selector => {
      const newElements = [...document.querySelectorAll(selector)] as HTMLElement[];
      if (newElements.length) {
        this.#elements = [...this.#elements, ...newElements];
      }
    });

    this.calculate();
  }

  get name(): string {
    return this.#name;
  }

  get totalHeight(): number {
    return this.#totalHeight;
  }

  get isValid(): boolean {
    return this.#isValid;
  }

  get elements(): HTMLElement[] {
    return this.#elements.filter((el): el is HTMLElement => el != null);
  }

  setElementHeight = (element: HTMLElement, height: number) => {
    if (!element || !Number.isFinite(height) || height < 0) return;
    this.#heightCache.set(element, Math.round(height));
  };

  #getElementHeight = (element: HTMLElement | null | undefined) => {
    if (!element) return 0;
    const cachedHeight = this.#heightCache.get(element);
    if (cachedHeight !== undefined) return cachedHeight;

    const measuredHeight = element.clientHeight || 0;
    this.#heightCache.set(element, measuredHeight);
    return measuredHeight;
  };

  calculate = (): this => {
    this.#isValid = this.#elements?.some(el => el != null) ?? false;
    if (this.#isValid && this.#condition && isFunction(this.#condition)) {
      this.#isValid = this.#isValid && this.#condition();
    }
    if (this.#isValid && this.#resizeCondition && isFunction(this.#resizeCondition)) {
      if (!('resizeConditionValue' in this)) {
        this.#resizeConditionValue = this.#resizeCondition();
      }
      this.#isValid = this.#isValid && this.#resizeConditionValue;
    }

    if (!this.#isValid) {
      this.#totalHeight = 0;
    } else if (this.#fixedHeight) {
      this.#totalHeight = this.#fixedHeight;
    } else {
      let totalHeight = 0;
      this.#elements.forEach(element => {
        totalHeight += this.#getElementHeight(element);
      });
      this.#totalHeight = totalHeight;
    }

    return this;
  };

  calculateResizeConditions = (): boolean => {
    if (this.#resizeCondition && isFunction(this.#resizeCondition)) {
      const oldValue = this.#resizeConditionValue || false;
      this.#resizeConditionValue = this.#resizeCondition();
      return oldValue != this.#resizeConditionValue;
    }
    return false;
  };
}

/**!
 * ScrollOffset - a class to handle add css variables to the body element,
 * with the value of the "header" parts that are visible
 * so that we can adjust scroll positions etc. based on it
 *
 * Author: Bogdan Barbu
 * Team: Codingheads (codingheads.com)
 */
export class ScrollOffset<TPartName extends string = string> {
  #offsetParts: ScrollOffsetPart[];
  #variables: ScrollOffsetVariable<TPartName>[];
  #extraEvents: string[];
  #registerForHoudini: boolean;
  #useResizeObserver: boolean;
  #measureScheduled: boolean = false;

  /**
   * setup the conditions
   */
  constructor({
    offsetParts = [],
    variables = [],
    registerForHoudini = true,
    useResizeObserver = true,
    extraEvents = [],
  }: ScrollOffsetSettings<TPartName> = {}) {
    // parse the variables
    if (Array.isArray(variables)) {
      this.#variables = variables;
    } else {
      this.#variables = Object.entries(variables).map(([key, value]) => {
        return {
          name: key,
          offsetParts: value,
        };
      });
    }

    // take the offset parts from the variables
    const variableOffsetParts = this.#variables
      .map(({ offsetParts }) => {
        return offsetParts.filter(
          part => part instanceof ScrollOffsetPart
        ) as ScrollOffsetPart[];
      })
      .flat(1);

    // merge with the settings and keep only distinct elements
    offsetParts = [...new Set([...offsetParts, ...variableOffsetParts])];

    // parse the offset parts
    this.#offsetParts = offsetParts.map(part => {
      let partObject = null;
      if (!(part instanceof ScrollOffsetPart)) {
        partObject = new ScrollOffsetPart(part);
      } else {
        partObject = part;
      }
      partObject.calculate();
      return partObject;
    });

    this.#extraEvents = extraEvents || [];
    this.#registerForHoudini =
      registerForHoudini && 'CSS' in window && 'registerProperty' in window.CSS;
    this.#useResizeObserver = 'ResizeObserver' in window && useResizeObserver;

    if (this.#registerForHoudini) {
      this.#registerCssVariables();
    }

    this.#setupListeners();
    this.#calculateOffset();
  }

  /**
   * register the css variables as length in the Houdini CSS API
   */
  #registerCssVariables = () => {
    this.#variables.forEach(({ name }) => {
      (window.CSS as any).registerProperty({
        name: `--${name}`,
        syntax: '<length>',
        inherits: true,
        initialValue: '0px',
      });
    });
  };

  /**
   * calculate the offsets and set the css variables
   */
  #calculateOffset = () => {
    // calculate the conditions
    this.#offsetParts.forEach(part => part.calculate());

    // determine the css variables
    const cssVariables = this.#variables.map(variable => {
      const value = variable.offsetParts.reduce((acc: number, part) => {
        if (typeof part == 'string') {
          part = this.#offsetParts.find(
            partInfo => partInfo.name.localeCompare(part as string) == 0
          );
        }
        if (part && part.isValid) {
          acc += part.totalHeight;
        }
        return acc;
      }, 0);
      return { ...variable, value };
    });

    // output the variables
    cssVariables.forEach(({ name, value }) => {
      document.documentElement.style.setProperty(`--${name}`, `${value}px`);
    });
    document.body.dispatchEvent(new CustomEvent('ScrollOffsetChange', { bubbles: true }));
  };

  /**
   * recalculate values for conditions that only depend on resize
   */
  #calculateResizeConditions = () => {
    this.#offsetParts.forEach(part => part.calculateResizeConditions());
  };

  #debouncedCalculateOffset = debounce(this.#calculateOffset, 32);
  #debouncedCalculateResizeConditions = debounce(this.#calculateResizeConditions, 32);

  #scheduleCalculateOffset = () => {
    if (this.#measureScheduled) return;
    this.#measureScheduled = true;

    requestAnimationFrame(() => {
      this.#measureScheduled = false;
      this.#debouncedCalculateOffset();
    });
  };

  /**
   * setup event listeners
   */
  #setupListeners = () => {
    ['resize', 'orientationchange'].forEach(type => {
      window.addEventListener(type, this.#debouncedCalculateResizeConditions);
    });

    [
      'resize',
      'orientationchange',
      'scrollDirectionChange',
      'stickyIsPinned',
      'stickyIsUnpinned',
      ...this.#extraEvents,
    ].forEach(type => window.addEventListener(type, this.#scheduleCalculateOffset));

    // setup resizeObservers for the elements
    if (this.#useResizeObserver) {
      const resizeObserver = new ResizeObserver(entries => {
        entries.forEach(entry => {
          const target = entry.target as HTMLElement;
          const height = Math.round(entry.contentRect?.height || target?.clientHeight || 0);
          if (!target || !height) return;

          this.#offsetParts.forEach(part => {
            if (part.elements.includes(target)) {
              part.setElementHeight(target, height);
            }
          });
        });

        this.#scheduleCalculateOffset();
      });
      this.#offsetParts.forEach(part =>
        part.elements.forEach(element => resizeObserver.observe(element))
      );
    }
  };
}

export default ScrollOffset;
