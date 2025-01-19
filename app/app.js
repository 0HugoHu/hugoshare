import Application from '@ember/application';
import Resolver from 'ember-resolver';
import loadInitializers from 'ember-load-initializers';
import config from 'sharedrop/config/environment';
import { inject as service } from '@ember/service';

export default class App extends Application {
  modulePrefix = config.modulePrefix;

  podModulePrefix = config.podModulePrefix;

  Resolver = Resolver;

  @service analytics;

  @service router;

  constructor() {
    super();

    // Track route changes
    this.router.on('routeDidChange', (transition) => {
      const url = transition.to.name;
      this.analytics.trackPageView(url);
    });
  }
}

loadInitializers(App, config.modulePrefix);
