export function getAppOrigin() {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.location.origin;
}
