export default {
  trackEvent(name, parameters) {
    if (window.gtag && typeof window.gtag === 'function') {
      window.gtag('event', name, parameters);
    }
  },
  trackPageView(url) {
    if (window.gtag && typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', {
        page_path: url,
      });
    }
  },
};
