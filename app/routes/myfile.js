import Route from '@ember/routing/route';

export default class MyFilesRoute extends Route {
  async model() {
    return this.store.findAll('file'); // Fetch user's files from your backend
  }
}
