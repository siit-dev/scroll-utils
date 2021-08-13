import { debounce, isFunction } from 'lodash';

export type ScrollOffsetPartSettings = {
  name?: string;
  selectors?: string[];
  elements?: HTMLElement[];
  fixedHeight?: number | false;
  condition?: Function | false;
  resizeCondition?: Function | false;
};

export type ScrollOffsetVariable = {
  name: string;
  offsetParts: Array<string | ScrollOffsetPart>;
};

export type ScrollOffsetMap = {
  [key: string]: Array<string | ScrollOffsetPart>;
};

export type ScrollOffsetSettings = {
  offsetParts?: ScrollOffsetPart[] | ScrollOffsetPartSettings[];
  variables?: ScrollOffsetVariable[] | ScrollOffsetMap;
  extraEvents?: string[];
  registerForHoudini?: boolean;
  useResizeObserver?: boolean;
};

export class ScrollOffsetPart {
  #name: string;
  #selectors: string[];
  #elements: HTMLElement[];
  #fixedHeight: number | false;
  #condition: Function | false;
  #resizeCondition: Function | false;

  #resizeConditionValue: boolean;
  #totalHeight: number = 0;
  #isValid: boolean = false;

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
    this.#elements = (elements || []).filter(Boolean);
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
    return this.#elements;
  }

  calculate = (): this => {
    this.#isValid = !!this.#elements?.length;
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
        totalHeight += element ? element.clientHeight : 0;
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
export class ScrollOffset {
  #offsetParts: ScrollOffsetPart[];
  #variables: ScrollOffsetVariable[];
  #extraEvents: string[];
  #registerForHoudini: boolean;
  #useResizeObserver: boolean;

  /**
   * setup the conditions
   */
  constructor({
    offsetParts = [],
    variables = [],
    registerForHoudini = true,
    useResizeObserver = true,
    extraEvents = [],
  }: ScrollOffsetSettings = {}) {
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
    ].forEach(type => window.addEventListener(type, this.#debouncedCalculateOffset));

    // setup resizeObservers for the elements
    if (this.#useResizeObserver) {
      const resizeObserver = new ResizeObserver(this.#debouncedCalculateOffset);
      this.#offsetParts.forEach(part =>
        part.elements.forEach(element => resizeObserver.observe(element))
      );
    }
  };
}

export default ScrollOffset;
