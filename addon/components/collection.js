import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action, set } from '@ember/object';

export default class CollectionComponent extends Component {
  @tracked collection = this.args?.field?.value || this.args?.model?.value;
  @tracked collectionSelected;
  @tracked displayItemActions;

  constructor(...args) {
    super(...args);
    let collection = this.collection;
    set(collection, 'pickedItems', collection.filter(item => item.picked).length);
    set(collection, 'selectedAll', collection.length === collection.pickedItems);
  }

  get embeddedCollection() {
    return this.collection.slice(0, 4);
  }

  @action
  collectionSelect() {
    this.itemUnselect();
    this.collectionSelected = true;
  }

  @action
  collectionUnselect() {
    this.collectionSelected = false;
  }

  @action
  itemSelect(id) {
    let collection = this.collection;
    if (collection.pickedItems > 1) {
      // if more than 1 item has been picked, continue picking items
      this.togglePick(id);
    } else {
      // else highlight individual items
      for (let item of collection) {
        if (item.id === id) {
          set(item, "selected", true);
        }
        else {
          set(item, "selected", false);
        }
      }
      this.collectionUnselect();
      this.unselectAll();
    }
  }

  @action
  itemUnselect() {
    let collection = this.collection;
    for (let item of collection) {
      set(item, "selected", false);
    }
  }

  @action
  openItemActionsMenu() {
    this.displayItemActions = true;
    // TODO
  }

  @action
  togglePick(id) {
    let collection = this.collection;
    for (let item of collection) {
      if (item.id === id) {
        set(item, "picked", !item.picked);
      }
    }
    this.itemUnselect();

    set(collection, 'pickedItems', collection.filter(item => item.picked).length);
    set(collection, 'selectedAll', collection.length === collection.pickedItems);
  }

  @action
  toggleSelectAll() {
    let collection = this.collection;
    if (collection.selectedAll || collection.pickedItems) {
      this.unselectAll();
    } else {
      for (let item of collection) {
        set(item, "picked", true);
      }
      set(collection, 'pickedItems', collection.length);
      set(collection, 'selectedAll', true);
    }
  }

  @action
  unselectAll() {
    let collection = this.collection;
    for (let item of collection) {
      set(item, "picked", false);
    }
    set(collection, 'pickedItems', 0);
    set(collection, 'selectedAll', false);
  }

  @action
  removeItem(id) {
    this.collection = this.collection.filter(item => item.id !== id);
    let collection = this.collection;
    set(collection, 'pickedItems', collection.filter(item => item.picked).length);
    set(collection, 'selectedAll', collection.length === collection.pickedItems);
  }
}
