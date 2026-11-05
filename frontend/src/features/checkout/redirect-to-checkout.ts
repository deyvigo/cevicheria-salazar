// Kept apart from the page so tests can replace the full-page navigation to the payment provider
export function redirectToCheckout(url: string) {
  window.location.assign(url);
}
