import Route from '@ember/routing/route';
import $ from 'jquery';

export default Route.extend({
  setupController(controller) {
    // Fetch session data from the server
    $.get('/api/session').done((data) => {
      // eslint-disable-next-line ember/jquery-ember-run
      controller.set('isAuthenticated', data.isAuthenticated);
      // eslint-disable-next-line ember/jquery-ember-run
      controller.set('userInfo', data.userInfo);
    });

    // Set this data on the controller to use in templates
    controller.set('currentRoute', this);
  },

  actions: {
    openModal(modalName) {
      return this.render(modalName, {
        outlet: 'modal',
        into: 'application',
      });
    },

    closeModal() {
      return this.disconnectOutlet({
        outlet: 'modal',
        parentView: 'application',
      });
    },
  },
});
