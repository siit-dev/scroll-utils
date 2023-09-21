# Scroll-related utilities

This library contains multiple scroll-related utilities, very useful in websites.

## ScrollDirection

This will put some classes on the `body` element depending on the scroll direction.

```javascript
import { ScrollDirection } from '@smartimpact-it/scroll-utils';

window.addEventListener('DOMContentLoaded', () => {
  new ScrollDirection({
    onlyFor: () => window.innerWidth > 992,
    threshold: 30,
  });
});
```

The `options` argument of the constructor has the following parameters:

- `onlyFor` - a callback to enable/disable the functionality based on some external factors (e.g. based on the viewport size)
- `threshold` - the minimum number of pixels for a change to be taken into consideration.

The classes it adds to the `body` element are:

- `scrolling-down`
- `scrolling-up`

Events:

- `scrollDirectionChange` - dispatched on the window

## ScrollPages

This plugin will add some classes to the body depending on the scroll position: above or below the fold (the first "visible part" of the website).

```javascript
import { ScrollPages } from '@smartimpact-it/scroll-utils';

window.addEventListener('DOMContentLoaded', () => {
  new ScrollPages();

  // or, with options:
  new ScrollPages({
    belowTheFoldClass: 'below-the-fold',
    aboveTheFoldClass: 'above-the-fold',
  });
});
```

The plugin can also accept an `intersectionElement` if you want to provide yourself the HTML element that will "separate" the "above-the-fold" part from the "below-the-fold" part. If not provided, the plugin generates this element automatically.

## ScrollOffset

This plugin monitors the size of specific UI elements (e.g. header elements) and creates CSS variables for their sizes. These are extremely useful when you have sticky headers and you need to adjust the `scroll-margin-top` property to take into account the sticky header.

```javascript
import { ScrollOffsetPart, ScrollOffset } from '@smartimpact-it/scroll-utils';

window.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('.page-header'),
    headerTop = header.querySelector('.page-header-inner-top'),
    headerBottom = header.querySelector('.page-header-bottom'),
    anchorSection = document.querySelector('.anchors-section');
  const topPart = new ScrollOffsetPart({
    name: 'top',
    elements: [headerTop],
    fixedHeight: headerTopHeight,
    condition: () => !body.classList.contains('sticky-pinned') && isLarge(),
  });
  const bottomPart = new ScrollOffsetPart({
    name: 'bottom',
    elements: [headerBottom],
  });
  const anchorsPart = new ScrollOffsetPart({
    name: 'anchors',
    elements: [anchorSection],
  });

  new ScrollOffset({
    variables: {
      'menu-space': [topPart, bottomPart],
      'full-menu-space': [topPart, bottomPart, anchorsPart],
    },
  });
});
```

You begin by defining `ScrollOffsetPart` objects - these are the UI elements that we are monitoring.
Then, you create the `ScrollOffset` instance and you pass the variables that you want to be created and which elements those variables should contain. For example, in the code above, the "--menu-space" CSS variable will contain the size of the `topPart` + `bottomPart`.

In CSS, you can use those variables to set `scroll-margin-top` or for other purposes:

```css
* {
  scroll-margin-top: var(--full-menu-space, 0);
}
```

## ScrollWithMarginTop

This is a function that allows you to scroll to an element using the correct `scroll-margin-top` or `scroll-snap-margin-top`. Safari < 14.5 doesn't properly support `scroll-margin-top`, so we are using `scroll-snap-margin-top` (which it can read, but doesn't do anything in this case).

You can then force the correct scroll-margin-top when the `hash` of the page changes (when you click on an anchor):

```javascript
import { scrollWithMarginTop, FixHashScrollPosition } from '@smartimpact-it/scroll-utils';

window.addEventListener('DOMContentLoaded', () => {
  // fix for scroll-margin-top
  window.addEventListener(
    'hashchange',
    () => {
      const hash = window.location.hash;
      const element = document.querySelector(hash);
      if (element) {
        setTimeout(() => scrollWithMarginTop(element));
      }
    },
    false
  );

  // or use the existing class:
  new FixHashScrollPosition();
});
```

And in CSS you do the following (put `scroll-snap-margin-top` above `scroll-margin-top`):

```css
* {
  scroll-snap-margin-top: var(--full-menu-space, 0);
  scroll-margin-top: var(--full-menu-space, 0);
}
```

The `scrollWithMarginTop` function has 3 parameters:

- `element` (HTMLElement) - the element to scroll to
- `offset` (numeric, default = `0`) - the offset for the scroll position (number of pixels)
- `onlyWhenNeeded` (boolean, default = `false`) - if this is `true`, it will not scroll if the element is already visible in the first half of the viewport

## Fix the scroll position for Bootstrap or Foundation accordions

When accordions open while another accordion tab above is open, the result is that some part of the new tab may be hidden. To fix this, we need to fix the scroll. You can use the `BootstrapAccordionScrollIntoView` and `FoundationAccordionScrollIntoView` classes, which in turn use the `scrollWithMarginTop` function.

```javascript
import { BootstrapAccordionScrollIntoView, FoundationAccordionScrollIntoView } from '@smartimpact-it/scroll-utils';

window.addEventListener('DOMContentLoaded', () => {
  // for bootstrap accordion
  new BootstrapAccordionScrollIntoView();

  // for foundation accordion
  new FoundationAccordionScrollIntoView();
}
```
