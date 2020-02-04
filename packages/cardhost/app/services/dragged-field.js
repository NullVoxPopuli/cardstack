import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';

function triggerEvent(el, type){
  var e = document.createEvent('HTMLEvents');
  e.initEvent(type, false, true);
  el.dispatchEvent(e);
}

export default class DraggedFieldService extends Service {
  @tracked field;
  @tracked dropzone;

  /**
   * Sets the currently dragged field
   */
  setField(field) {
    console.log('setting field to ', field);
    this.field = field;
  }

  /**
   * Gets the currently dragged field
   */
  getField() {
    return this.field;
  }

  /**
   * Clears the dragged field
   */
  clearField() {
    this.field = null;
  }

  /**
   * Set the hovered drop zone
   */
  setDropzone(element) {
    this.dropzone = element;
    triggerEvent(element, 'mouseenter');
  }

  /**
   * Get the hovered drop zone
   */
  getDropzone() {
    return this.dropzone;
  }

  /**
   * Clear the dropzone
   */
  clearDropzone() {
    if (this.dropzone) {
      triggerEvent(this.dropzone, 'mouseleave');
      this.dropzone = null;
    }
  }
}
