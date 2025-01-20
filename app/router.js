import EmberRouter from '@ember/routing/router';
import config from 'sharedrop/config/environment';

export default class Router extends EmberRouter {
  location = config.locationType;

  rootURL = config.rootURL;

  // Track page views
  didTransition() {
    super.didTransition();

    // Track page view using Google Analytics
    if (window.gtag && typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', {
        page_path: this.currentURL,
      });
    }
  }
}

// eslint-disable-next-line array-callback-return
Router.map(function () {
  this.route('room', {
    path: '/rooms/:room_id',
  });
});
