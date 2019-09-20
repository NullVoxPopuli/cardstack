import Controller from '@ember/controller';
import { action } from '@ember/object';

export default class CatalogIndexController extends Controller {
  @action
  preview(modelName) {
    this.transitionToRoute('catalog.preview', modelName);
  }
}
