// app/components/file-history.js
import Component from '@glimmer/component';

export default class FileHistoryComponent extends Component {
  // The history passed as an argument
  get history() {
    return this.args.history;
  }
}
