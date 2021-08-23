/**
 * Scroll to an element taking into account its "scroll-margin-top"/"scroll-snap-margin-top".
 * This will help with Safari < 14.1 / Safari iOS <= 1.4, which doesn't support "scroll-margin-top".
 */
export const scrollWithMarginTop = (
  element: HTMLElement,
  offset: number = 0,
  onlyWhenNeeded = false
) => {
  if (!element) return;

  const rect = element.getBoundingClientRect();
  const pageYOffset = window.pageYOffset;
  const top = rect.top + pageYOffset;
  const style = window.getComputedStyle(element);
  const scrollMarginTop =
    parseInt(style.getPropertyValue('scroll-margin-top')) ||
    parseInt(style.getPropertyValue('scroll-snap-margin-top')) ||
    0;
  const newPosition = top - scrollMarginTop + offset;

  // don't scroll if the element is already visible in the first half of the screen
  if (onlyWhenNeeded) {
    const isVisible =
      newPosition >= pageYOffset &&
      newPosition + rect.height < pageYOffset + window.innerHeight / 2;
    if (isVisible) {
      return;
    }
  }

  window.scrollTo({ top: newPosition, left: 0, behavior: 'smooth' });
};
