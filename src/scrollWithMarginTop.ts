/**
 * Scroll to an element taking into account its "scroll-margin-top"/"scroll-snap-margin-top".
 * This will help with Safari < 14.1 / Safari iOS <= 1.4, which doesn't support "scroll-margin-top".
 */
export const scrollWithMarginTop = (element: HTMLElement, offset: number = 0) => {
  if (!element) return;

  const rect = element.getBoundingClientRect();
  const top = rect.top + window.pageYOffset;
  const style = window.getComputedStyle(element);
  const scrollMarginTop =
    parseInt(style.getPropertyValue('scroll-margin-top')) ||
    parseInt(style.getPropertyValue('scroll-snap-margin-top')) ||
    0;
  const newPosition = top - scrollMarginTop + offset;

  window.scrollTo({ top: newPosition, left: 0, behavior: 'smooth' });
};
