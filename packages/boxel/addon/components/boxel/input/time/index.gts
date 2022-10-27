import Component from '@glimmer/component';
import { svgJar } from '@cardstack/boxel/utils/svg-jar';
import BoxelDropdown, { DropdownAPI } from '../../dropdown';
import BoxelButton from '../../button';
import BoxelMenu from '../../menu';
import menuItem, { menuItemFunc, MenuItem } from '@cardstack/boxel/helpers/menu-item'
import registerElement from '@cardstack/boxel/modifiers/register-element';
import { action } from '@ember/object';
//@ts-expect-error glint does not think this is consumed-but it is consumed in the template https://github.com/typed-ember/glint/issues/374
import { fn, array, hash } from '@ember/helper';
import onKey from 'ember-keyboard/helpers/on-key';
import map from 'ember-composable-helpers/helpers/map';
import set from 'ember-set-helper/helpers/set';
import eq from 'ember-truth-helpers/helpers/eq';
import { registerDestructor } from '@ember/destroyable';
import { default as Owner } from '@ember/owner';
import { later } from '@ember/runloop';
import focusTrap from 'ember-focus-trap/modifiers/focus-trap';
import {
  KeyboardFocus,
  KeyboardHandler,
  KeyboardControllableTimeComponent,
  NoneFocusKeyboardHandler,
  HourFocusKeyboardHandler,
  MinuteFocusKeyboardHandler,
  MeridianFocusKeyboardHandler
} from './keyboard';

import '@cardstack/boxel/styles/global.css';
import './index.css';

export interface Time {
  getHours: () => number;
  getMinutes: () => number;
  getTime: () => number;
  toLocaleTimeString: (arg1: any, options: any) => string;
}

interface ComponentArgs {
  value?: Time;
  minuteInterval?: number;
  onChange?: (arg0: Time) => void;
}

interface Signature {
  Element: HTMLButtonElement | HTMLAnchorElement;
  Args: ComponentArgs;
}

interface TimeOption {
  value: number;
  display: string;
}

export default class BoxelInputTime extends Component<Signature> implements KeyboardControllableTimeComponent {
  dropdownAPI?: DropdownAPI;
  #recentString?: string;
  #recentInputTimer?: any;
  containerElement?: HTMLDivElement;
  triggerElement?: HTMLDivElement;
  keyboardHandlers: Record<KeyboardFocus, KeyboardHandler>;

  constructor(owner: Owner, args: ComponentArgs) {
    super(owner, args);

    this.validateMinuteInterval();
    this.keyboardHandlers = {
      none: new NoneFocusKeyboardHandler(this),
      hour: new HourFocusKeyboardHandler(this),
      minute: new MinuteFocusKeyboardHandler(this),
      meridian: new MeridianFocusKeyboardHandler(this),
    }
    registerDestructor(this, () => {
      this.#recentInputTimer?.cancel?.();
    });
  }

  get minuteInterval() {
    this.validateMinuteInterval();
    return this.args.minuteInterval || 5;
  }

  get timeString() {
    return this.args.value?.toLocaleTimeString([], {
      hour: 'numeric',
      minute: 'numeric',
      timeZoneName: 'short'
    });
  }

  get hour() {
    return this.args.value ? (this.args.value.getHours() % 12) : undefined;
  }

  get minute() {
    return this.args.value?.getMinutes();
  }

  get meridian() {
    if (this.args.value) {
      return this.args.value.getHours() < 12 ? 'am' : 'pm';
    }

    return undefined;
  }

  get hourOptions(): TimeOption[] {
    return [...Array(12).keys()].map((value) => {
      return {
        value,
        display: value === 0 ? '12' : value.toString()
      };
    });
  }

  get minuteOptions(): TimeOption[] {
    return [...Array(60 / this.minuteInterval).keys()].map(n => n * this.minuteInterval ).map((value) => {
      return {
        value,
        display: (value < 10 ? '0' : '') + value.toString()
      };
    });
  }

  get keyboardFocus(): KeyboardFocus {
    let focusedEl = document.activeElement;
    if (!focusedEl) {
      return 'none';
    }
    if (!focusedEl.hasAttribute('data-keyboard-focus')) {
      return 'none';
    }
    return focusedEl.getAttribute('data-keyboard-focus') as KeyboardFocus;
  }

  set keyboardFocus(val: KeyboardFocus) {
    if (this.keyboardFocus !== val) {
      let targetEl = this.containerElement?.querySelector(`[data-keyboard-focus="${val}"]`) as HTMLUListElement;
      targetEl?.focus();
    }
  }

  @action setHour(hourNum: number){
    let { value } = this.args;
    let effectiveDate = value ? new Date(value.getTime()) : new Date();
    if (effectiveDate.getHours() > 11) {
      hourNum = hourNum + 12;
    }
    let dateMs = effectiveDate.setHours(hourNum);
    this.args.onChange?.(new Date(dateMs));
  }

  @action setMinute(minuteNum: number) {
    minuteNum = Math.floor(minuteNum / this.minuteInterval) * this.minuteInterval; // round down to nearest interval
    let { value } = this.args;
    let effectiveDate = value ? new Date(value.getTime()) : new Date();
    let dateMs = effectiveDate.setMinutes(minuteNum);
    this.args.onChange?.(new Date(dateMs));
  }

  @action setMeridian(newMeridian: 'am'|'pm'){
    if (this.meridian == newMeridian) {
      return;
    }
    let { value } = this.args;
    let effectiveDate = value ? new Date(value.getTime()) : new Date();
    let hourNum;
    if (newMeridian === 'am') {
       hourNum = effectiveDate.getHours() - 12;
    } else {
      hourNum = effectiveDate.getHours() + 12;
    }
    let dateMs = effectiveDate.setHours(hourNum);
    this.args.onChange?.(new Date(dateMs));
  }

  decrementHour() {
    if (this.hour === undefined) {
      this.setHour(11);
      return;
    }
    if (this.hour > 0) {
      this.setHour(this.hour - 1);
      return;
    }
    if (this.hour === 0) {
      this.setHour(11);
      this.setMeridian(this.meridian == 'am' ? 'pm' : 'am');
    }
  }

  incrementHour() {
    if (this.hour === undefined) {
      this.setHour(0);
      return;
    }
    if (this.hour < 11) {
      this.setHour(this.hour + 1);
      return;
    }
    if (this.hour === 11) {
      this.setHour(0);
      this.setMeridian(this.meridian == 'am' ? 'pm' : 'am');
    }
  }

  decrementMinute() {
    let highestValue = this.minuteOptions[this.minuteOptions.length - 1].value;

    if (this.minute === undefined) {
      this.setMinute(highestValue);
      return;
    }
    if (this.minute > 0) {
      this.setMinute(this.minute - this.minuteInterval);
      return;
    }
    if (this.minute === 0) {
      this.setMinute(highestValue);
    }
  }

  incrementMinute() {
    if (this.minute === undefined) {
      this.setMinute(0);
      return;
    }
    let highestValue = this.minuteOptions[this.minuteOptions.length - 1].value;
    if (this.minute < highestValue) {
      this.setMinute(this.minute + this.minuteInterval);
      return;
    }
    if (this.minute === highestValue) {
      this.setMinute(0);
    }
  }
  
  toggleMeridian() {
    if (this.meridian === 'pm' || this.meridian === undefined) {
      this.setMeridian('am');
    } else if (this.meridian === 'am') {
      this.setMeridian('pm');
    }
  }

  @action handleKeyboardEvent(ev: KeyboardEvent){
    this.keyboardHandlers[this.keyboardFocus].handle(ev);
  }

  updateHourFromNumericInput(numString: string): void {
    if (this.#recentString) {
      numString = `${this.#recentString}${numString}`;
    }
    let hour = this.matchTimeOption(
      this.hourOptions,
      numString
    )?.value;
    if (hour !== undefined) {
      this.setHour(hour);
      this.setRecentInput(numString);
    }
  }

  updateMinuteFromNumericInput(numString: string): void {
    if (this.#recentString) {
      numString = `${this.#recentString}${numString}`;
    }
    let minute = this.matchTimeOption(
      this.minuteOptions,
      numString
    )?.value;
    if (minute !== undefined) {
      this.setMinute(minute);
      this.setRecentInput(numString);
    }
  }

  clearRecentInput() {
    this.#recentString = undefined;
    this.#recentInputTimer?.cancel?.();
  }

  setRecentInput(numString: string) {
    if (numString.length >= 2) {
      this.clearRecentInput();
      return;
    }
    this.#recentString = numString;
    this.#recentInputTimer = later(this, () => {
      this.#recentString = undefined;
    }, 2000);
  }

  matchTimeOption(options: TimeOption[], numString: string): TimeOption | undefined {
    // first try for an exact match
    let match = options.find(o => o.display === numString);
    if (match) {
      return match;
    }
    // otherwise match the shortest display text that starts with the specified text
    let matches = options.filter(o => o.display.startsWith(numString)).sort((a,b) => b.display.length - a.display.length);
    return matches[0];
  }

  @action buildMenuItem(selectedValue: number, onChoose: (val: number) => void, option: TimeOption): MenuItem {
    return menuItemFunc([option.display, () => onChoose(option.value)], { selected: selectedValue === option.value,  tabindex: -1});
  }

  @action setDropdownAPI(dropdownAPI: DropdownAPI) {
    this.dropdownAPI = dropdownAPI;
  }

  @action resetKeyboardFocus() {
    this.triggerElement?.focus();
  }

  validateMinuteInterval() {
    if (this.args.minuteInterval && (60 % this.args.minuteInterval !== 0)) {
      throw new Error(`@minuteInterval passed to Boxel::Input::Time must be a factor of 60 but was ${this.args.minuteInterval}`);
    }
  }

  <template>
    <BoxelDropdown
      class="boxel-input-time"
      @contentClass="boxel-input-time__content"
      @registerAPI={{this.setDropdownAPI}}
      @onClose={{this.resetKeyboardFocus}}
      data-test-boxel-input-time
    >
      <:trigger as |bindings|>
        <BoxelButton
          {{bindings}}
          {{registerElement (set this 'triggerElement')}}
          class="boxel-input-time__trigger"
          data-test-boxel-input-time-trigger
          ...attributes
        >
          {{svgJar 'clock' class="boxel-input-time__icon" role="presentation"}}
          {{this.timeString}}
          {{svgJar "caret-down" class="boxel-input-time__caret" width=8 height=8 role="presentation"}}
        </BoxelButton>
      </:trigger>
      <:content>
        <div
          class="boxel-input-time__menu-container"
          {{registerElement (set this 'containerElement')}}
          {{focusTrap focusTrapOptions=(hash initialFocus=false)}}
        >
          {{onKey '_all' this.handleKeyboardEvent}}
          <BoxelMenu
            data-keyboard-focus="hour"
            data-test-boxel-hour-menu
            class="boxel-input-time__menu"
            tabindex="1"
            @items={{map (fn this.buildMenuItem this.hour this.setHour) this.hourOptions}}
            @itemClass="boxel-input-time__menu-item"
          />
          <BoxelMenu
            data-keyboard-focus="minute"
            data-test-boxel-minute-menu
            class="boxel-input-time__menu"
            tabindex="2"
            @items={{map (fn this.buildMenuItem this.minute this.setMinute) this.minuteOptions}}
            @itemClass="boxel-input-time__menu-item"
          />
          <BoxelMenu
            data-keyboard-focus="meridian"
            data-test-boxel-meridian-menu
            class="boxel-input-time__menu"
            tabindex="3"
            @items={{array
              (menuItem "am" (fn this.setMeridian 'am') selected=(eq this.meridian "am") tabindex=-1)
              (menuItem "pm" (fn this.setMeridian 'pm') selected=(eq this.meridian "pm") tabindex=-1)
            }}
            @itemClass="boxel-input-time__menu-item"
          />
        </div>
      </:content>
    </BoxelDropdown>
  </template>
}

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    'Boxel::Input::Time': typeof BoxelInputTime;
  }
}
