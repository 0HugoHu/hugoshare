import Application from '@ember/application';
import Resolver from 'ember-resolver';
import loadInitializers from 'ember-load-initializers';
import config from 'sharedrop/config/environment';

window.global = window.global || window;

export default class App extends Application {
  modulePrefix = config.modulePrefix;

  podModulePrefix = config.podModulePrefix;

  Resolver = Resolver;

  constructor() {
    // eslint-disable-next-line prefer-rest-params
    super(...arguments);
    if (window.gtag && typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', {
        page_path: window.location.pathname,
      });
    }
  }
}

loadInitializers(App, config.modulePrefix);
