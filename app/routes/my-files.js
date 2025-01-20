import Route from '@ember/routing/route';
import { tracked } from '@glimmer/tracking';

export default class MyFilesRoute extends Route {
  @tracked fileHistory = [];

  // eslint-disable-next-line class-methods-use-this
  async model() {
    const response = await fetch('/api/list-files');
    const data = await response.json();

    // Directly return the list of files with their download URLs
    return data.files;
  }
}
