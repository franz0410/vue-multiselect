import { openBlock, createElementBlock, normalizeClass, withKeys, withModifiers, renderSlot, createElementVNode, withDirectives, Fragment, renderList, toDisplayString, vShow, createCommentVNode, createVNode, Transition, withCtx, normalizeStyle, createTextVNode } from 'vue';

function isEmpty (opt) {
  if (opt === 0) return false
  if (Array.isArray(opt) && opt.length === 0) return true
  return !opt
}

function not (fun) {
  return (...params) => !fun(...params)
}

function includes (str, query) {
  /* istanbul ignore else */
  if (str === undefined) str = 'undefined';
  if (str === null) str = 'null';
  if (str === false) str = 'false';
  const text = str.toString().toLowerCase();
  return text.indexOf(query.trim()) !== -1
}

function filterOptions (options, search, label, customLabel) {
  return search ? options
    .filter((option) => includes(customLabel(option, label), search))
    .sort((a, b) => customLabel(a, label).length - customLabel(b, label).length) : options
}

function stripGroups (options) {
  return options.filter((option) => !option.$isLabel)
}

function flattenOptions (values, label) {
  return (options) =>
    options.reduce((prev, curr) => {
      /* istanbul ignore else */
      if (curr[values] && curr[values].length) {
        prev.push({
          $groupLabel: curr[label],
          $isLabel: true
        });
        return prev.concat(curr[values])
      }
      return prev
    }, [])
}

function filterGroups (search, label, values, groupLabel, customLabel) {
  return (groups) =>
    groups.map((group) => {
      /* istanbul ignore else */
      if (!group[values]) {
        console.warn(`Options passed to vue-multiselect do not contain groups, despite the config.`);
        return []
      }
      const groupOptions = filterOptions(group[values], search, label, customLabel);

      return groupOptions.length
        ? {
          [groupLabel]: group[groupLabel],
          [values]: groupOptions
        }
        : []
    })
}

const flow = (...fns) => (x) => fns.reduce((v, f) => f(v), x);

var multiselectMixin = {
  data () {
    return {
      search: '',
      isOpen: false,
      preferredOpenDirection: 'below',
      optimizedHeight: this.maxHeight
    }
  },
  props: {
    /**
     * Decide whether to filter the results based on search query.
     * Useful for async filtering, where we search through more complex data.
     * @type {Boolean}
     */
    internalSearch: {
      type: Boolean,
      default: true
    },
    /**
     * Array of available options: Objects, Strings or Integers.
     * If array of objects, visible label will default to option.label.
     * If `labal` prop is passed, label will equal option['label']
     * @type {Array}
     */
    options: {
      type: Array,
      required: true
    },
    /**
     * Equivalent to the `multiple` attribute on a `<select>` input.
     * @default false
     * @type {Boolean}
     */
    multiple: {
      type: Boolean,
      default: false
    },
    /**
     * Key to compare objects
     * @default 'id'
     * @type {String}
     */
    trackBy: {
      type: String
    },
    /**
     * Label to look for in option Object
     * @default 'label'
     * @type {String}
     */
    label: {
      type: String
    },
    /**
     * Enable/disable search in options
     * @default true
     * @type {Boolean}
     */
    searchable: {
      type: Boolean,
      default: true
    },
    /**
     * Clear the search input after `)
     * @default true
     * @type {Boolean}
     */
    clearOnSelect: {
      type: Boolean,
      default: true
    },
    /**
     * Hide already selected options
     * @default false
     * @type {Boolean}
     */
    hideSelected: {
      type: Boolean,
      default: false
    },
    /**
     * Equivalent to the `placeholder` attribute on a `<select>` input.
     * @default 'Select option'
     * @type {String}
     */
    placeholder: {
      type: String,
      default: 'Select option'
    },
    /**
     * Allow to remove all selected values
     * @default true
     * @type {Boolean}
     */
    allowEmpty: {
      type: Boolean,
      default: true
    },
    /**
     * Reset this.internalValue, this.search after this.internalValue changes.
     * Useful if want to create a stateless dropdown.
     * @default false
     * @type {Boolean}
     */
    resetAfter: {
      type: Boolean,
      default: false
    },
    /**
     * Enable/disable closing after selecting an option
     * @default true
     * @type {Boolean}
     */
    closeOnSelect: {
      type: Boolean,
      default: true
    },
    /**
     * Function to interpolate the custom label
     * @default false
     * @type {Function}
     */
    customLabel: {
      type: Function,
      default (option, label) {
        if (isEmpty(option)) return ''
        return label ? option[label] : option
      }
    },
    /**
     * Disable / Enable tagging
     * @default false
     * @type {Boolean}
     */
    taggable: {
      type: Boolean,
      default: false
    },
    /**
     * String to show when highlighting a potential tag
     * @default 'Press enter to create a tag'
     * @type {String}
    */
    tagPlaceholder: {
      type: String,
      default: 'Press enter to create a tag'
    },
    /**
     * By default new tags will appear above the search results.
     * Changing to 'bottom' will revert this behaviour
     * and will proritize the search results
     * @default 'top'
     * @type {String}
    */
    tagPosition: {
      type: String,
      default: 'top'
    },
    /**
     * Number of allowed selected options. No limit if 0.
     * @default 0
     * @type {Number}
    */
    max: {
      type: [Number, Boolean],
      default: false
    },
    /**
     * Will be passed with all events as second param.
     * Useful for identifying events origin.
     * @default null
     * @type {String|Integer}
    */
    id: {
      default: null
    },
    /**
     * Limits the options displayed in the dropdown
     * to the first X options.
     * @default 1000
     * @type {Integer}
    */
    optionsLimit: {
      type: Number,
      default: 1000
    },
    /**
     * Name of the property containing
     * the group values
     * @default 1000
     * @type {String}
    */
    groupValues: {
      type: String
    },
    /**
     * Name of the property containing
     * the group label
     * @default 1000
     * @type {String}
    */
    groupLabel: {
      type: String
    },
    /**
     * Allow to select all group values
     * by selecting the group label
     * @default false
     * @type {Boolean}
     */
    groupSelect: {
      type: Boolean,
      default: false
    },
    /**
     * Array of keyboard keys to block
     * when selecting
     * @default 1000
     * @type {String}
    */
    blockKeys: {
      type: Array,
      default () {
        return []
      }
    },
    /**
     * Prevent from wiping up the search value
     * @default false
     * @type {Boolean}
    */
    preserveSearch: {
      type: Boolean,
      default: false
    },
    /**
     * Select 1st options if value is empty
     * @default false
     * @type {Boolean}
    */
    preselectFirst: {
      type: Boolean,
      default: false
    },
    /**
     * Prevent autofocus
     * @default false
     * @type {Boolean}
    */
    preventAutofocus: {
      type: Boolean,
      default: false
    }
  },
  mounted () {
    /* istanbul ignore else */
    if (!this.multiple && this.max) {
      console.warn('[Vue-Multiselect warn]: Max prop should not be used when prop Multiple equals false.');
    }
    if (
      this.preselectFirst &&
      !this.internalValue.length &&
      this.options.length
    ) {
      this.select(this.filteredOptions[0]);
    }
  },
  computed: {
    internalValue () {
      return this.modelValue || this.modelValue === 0
        ? Array.isArray(this.modelValue) ? this.modelValue : [this.modelValue]
        : []
    },
    filteredOptions () {
      const search = this.search || '';
      const normalizedSearch = search.toLowerCase().trim();

      let options = this.options.concat();

      /* istanbul ignore else */
      if (this.internalSearch) {
        options = this.groupValues
          ? this.filterAndFlat(options, normalizedSearch, this.label)
          : filterOptions(options, normalizedSearch, this.label, this.customLabel);
      } else {
        options = this.groupValues ? flattenOptions(this.groupValues, this.groupLabel)(options) : options;
      }

      options = this.hideSelected
        ? options.filter(not(this.isSelected))
        : options;

      /* istanbul ignore else */
      if (this.taggable && normalizedSearch.length && !this.isExistingOption(normalizedSearch)) {
        if (this.tagPosition === 'bottom') {
          options.push({isTag: true, label: search});
        } else {
          options.unshift({isTag: true, label: search});
        }
      }

      return options.slice(0, this.optionsLimit)
    },
    valueKeys () {
      if (this.trackBy) {
        return this.internalValue.map((element) => element[this.trackBy])
      } else {
        return this.internalValue
      }
    },
    optionKeys () {
      const options = this.groupValues ? this.flatAndStrip(this.options) : this.options;
      return options.map((element) => this.customLabel(element, this.label).toString().toLowerCase())
    },
    currentOptionLabel () {
      return this.multiple
        ? this.searchable ? '' : this.placeholder
        : this.internalValue.length
          ? this.getOptionLabel(this.internalValue[0])
          : this.searchable ? '' : this.placeholder
    }
  },
  watch: {
    internalValue: {
      handler () {
      /* istanbul ignore else */
        if (this.resetAfter && this.internalValue.length) {
          this.search = '';
          this.$emit('update:modelValue', this.multiple ? [] : null);
        }
      },
      deep: true
    },
    search () {
      this.$emit('search-change', this.search);
    }
  },
  emits: ['open', 'search-change', 'close', 'select', 'update:modelValue', 'remove', 'tag'],
  methods: {
    /**
     * Returns the internalValue in a way it can be emited to the parent
     * @returns {Object||Array||String||Integer}
     */
    getValue () {
      return this.multiple
        ? this.internalValue
        : this.internalValue.length === 0
          ? null
          : this.internalValue[0]
    },
    /**
     * Filters and then flattens the options list
     * @param  {Array}
     * @return {Array} returns a filtered and flat options list
     */
    filterAndFlat (options, search, label) {
      return flow(
        filterGroups(search, label, this.groupValues, this.groupLabel, this.customLabel),
        flattenOptions(this.groupValues, this.groupLabel)
      )(options)
    },
    /**
     * Flattens and then strips the group labels from the options list
     * @param  {Array}
     * @return {Array} returns a flat options list without group labels
     */
    flatAndStrip (options) {
      return flow(
        flattenOptions(this.groupValues, this.groupLabel),
        stripGroups
      )(options)
    },
    /**
     * Updates the search value
     * @param  {String}
     */
    updateSearch (query) {
      this.search = query;
    },
    /**
     * Finds out if the given query is already present
     * in the available options
     * @param  {String}
     * @return {Boolean} returns true if element is available
     */
    isExistingOption (query) {
      return !this.options
        ? false
        : this.optionKeys.indexOf(query) > -1
    },
    /**
     * Finds out if the given element is already present
     * in the result value
     * @param  {Object||String||Integer} option passed element to check
     * @returns {Boolean} returns true if element is selected
     */
    isSelected (option) {
      const opt = this.trackBy
        ? option[this.trackBy]
        : option;
      return this.valueKeys.indexOf(opt) > -1
    },
    /**
     * Finds out if the given option is disabled
     * @param  {Object||String||Integer} option passed element to check
     * @returns {Boolean} returns true if element is disabled
     */
    isOptionDisabled (option) {
      return !!option.$isDisabled
    },
    /**
     * Returns empty string when options is null/undefined
     * Returns tag query if option is tag.
     * Returns the customLabel() results and casts it to string.
     *
     * @param  {Object||String||Integer} Passed option
     * @returns {Object||String}
     */
    getOptionLabel (option) {
      if (isEmpty(option)) return ''
      /* istanbul ignore else */
      if (option.isTag) return option.label
      /* istanbul ignore else */
      if (option.$isLabel) return option.$groupLabel

      const label = this.customLabel(option, this.label);
      /* istanbul ignore else */
      if (isEmpty(label)) return ''
      return label
    },
    /**
     * Add the given option to the list of selected options
     * or sets the option as the selected option.
     * If option is already selected -> remove it from the results.
     *
     * @param  {Object||String||Integer} option to select/deselect
     * @param  {Boolean} block removing
     */
    select (option, key) {
      /* istanbul ignore else */
      if (option.$isLabel && this.groupSelect) {
        this.selectGroup(option);
        return
      }
      if (this.blockKeys.indexOf(key) !== -1 ||
        this.disabled ||
        option.$isDisabled ||
        option.$isLabel
      ) return
      /* istanbul ignore else */
      if (this.max && this.multiple && this.internalValue.length === this.max) return
      /* istanbul ignore else */
      if (key === 'Tab' && !this.pointerDirty) return
      if (option.isTag) {
        this.$emit('tag', option.label, this.id);
        this.search = '';
        if (this.closeOnSelect && !this.multiple) this.deactivate('banana');
      } else {
        const isSelected = this.isSelected(option);

        if (isSelected) {
          if (key !== 'Tab') this.removeElement(option);
          return
        }

        if (this.multiple) {
          this.$emit('update:modelValue', this.internalValue.concat([option]));
        } else {
          this.$emit('update:modelValue', option);
        }

        this.$emit('select', option, this.id);

        /* istanbul ignore else */
        if (this.clearOnSelect) this.search = '';
      }
      /* istanbul ignore else */
      if (this.closeOnSelect) this.deactivate('mela');
    },
    /**
     * Add the given group options to the list of selected options
     * If all group optiona are already selected -> remove it from the results.
     *
     * @param  {Object||String||Integer} group to select/deselect
     */
    selectGroup (selectedGroup) {
      const group = this.options.find((option) => {
        return option[this.groupLabel] === selectedGroup.$groupLabel
      });

      if (!group) return

      if (this.wholeGroupSelected(group)) {
        this.$emit('remove', group[this.groupValues], this.id);

        const groupValues = this.trackBy ? group[this.groupValues].map(val => val[this.trackBy]) : group[this.groupValues];
        const newValue = this.internalValue.filter(
          option => groupValues.indexOf(this.trackBy ? option[this.trackBy] : option) === -1
        );

        this.$emit('update:modelValue', newValue);
      } else {
        let optionsToAdd = group[this.groupValues].filter(
          option => !(this.isOptionDisabled(option) || this.isSelected(option))
        );

        // if max is defined then just select options respecting max
        if (this.max) {
          optionsToAdd.splice(this.max - this.internalValue.length);
        }

        this.$emit('select', optionsToAdd, this.id);
        this.$emit(
          'update:modelValue',
          this.internalValue.concat(optionsToAdd)
        );
      }

      if (this.closeOnSelect) this.deactivate('arancia');
    },
    /**
     * Helper to identify if all values in a group are selected
     *
     * @param {Object} group to validated selected values against
     */
    wholeGroupSelected (group) {
      return group[this.groupValues].every((option) => this.isSelected(option) || this.isOptionDisabled(option)
      )
    },
    /**
     * Helper to identify if all values in a group are disabled
     *
     * @param {Object} group to check for disabled values
     */
    wholeGroupDisabled (group) {
      return group[this.groupValues].every(this.isOptionDisabled)
    },
    /**
     * Removes the given option from the selected options.
     * Additionally checks this.allowEmpty prop if option can be removed when
     * it is the last selected option.
     *
     * @param  {type} option description
     * @return {type}        description
     */
    removeElement (option, shouldClose = true) {
      /* istanbul ignore else */
      if (this.disabled) return
      /* istanbul ignore else */
      if (option.$isDisabled) return
      /* istanbul ignore else */
      if (!this.allowEmpty && this.internalValue.length <= 1) {
        this.deactivate('cocco');
        return
      }

      const index = typeof option === 'object'
        ? this.valueKeys.indexOf(option[this.trackBy])
        : this.valueKeys.indexOf(option);

      if (this.multiple) {
        const newValue = this.internalValue.slice(0, index).concat(this.internalValue.slice(index + 1));
        this.$emit('update:modelValue', newValue);
      } else {
        this.$emit('update:modelValue', null);
      }
      this.$emit('remove', option, this.id);

      /* istanbul ignore else */
      if (this.closeOnSelect && shouldClose) this.deactivate('pera');
    },
    /**
     * Calls this.removeElement() with the last element
     * from this.internalValue (selected element Array)
     *
     * @fires this#removeElement
     */
    removeLastElement () {
      /* istanbul ignore else */
      if (this.blockKeys.indexOf('Delete') !== -1) return
      /* istanbul ignore else */
      if (this.search.length === 0 && Array.isArray(this.internalValue) && this.internalValue.length) {
        this.removeElement(this.internalValue[this.internalValue.length - 1], false);
      }
    },
    /**
     * Opens the multiselect’s dropdown.
     * Sets this.isOpen to TRUE
     */
    activate () {
      /* istanbul ignore else */
      if (this.isOpen || this.disabled) return

      this.adjustPosition();
      /* istanbul ignore else  */
      if (this.groupValues && this.pointer === 0 && this.filteredOptions.length) {
        this.pointer = 1;
      }

      this.isOpen = true;
      /* istanbul ignore else  */
      if (this.searchable) {
        if (!this.preserveSearch) this.search = '';
        if (!this.preventAutofocus) this.$nextTick(() => this.$refs.search && this.$refs.search.focus());
      } else if (!this.preventAutofocus) {
        if (typeof this.$el !== 'undefined') this.$el.focus();
      }
      this.$emit('open', this.id);
    },
    /**
     * Closes the multiselect’s dropdown.
     * Sets this.isOpen to FALSE
     */
    deactivate (here = '') {
      console.log(here);
      /* istanbul ignore else */
      if (!this.isOpen) return

      this.isOpen = false;
      /* istanbul ignore else  */
      if (this.searchable) {
        if (this.$refs.search !== null && typeof this.$refs.search !== 'undefined') this.$refs.search.blur();
      } else {
        if (typeof this.$el !== 'undefined') this.$el.blur();
      }
      if (!this.preserveSearch) this.search = '';
      this.$emit('close', this.getValue(), this.id);
    },
    /**
     * Call this.activate() or this.deactivate()
     * depending on this.isOpen value.
     *
     * @fires this#activate || this#deactivate
     * @property {Boolean} isOpen indicates if dropdown is open
     */
    toggle (here = '') {
      this.isOpen
        ? this.deactivate(here)
        : this.activate();
    },
    /**
     * Updates the hasEnoughSpace variable used for
     * detecting where to expand the dropdown
     */
    adjustPosition () {
      if (typeof window === 'undefined') return

      const spaceAbove = this.$el.getBoundingClientRect().top;
      const spaceBelow = window.innerHeight - this.$el.getBoundingClientRect().bottom;
      const hasEnoughSpaceBelow = spaceBelow > this.maxHeight;

      if (hasEnoughSpaceBelow || spaceBelow > spaceAbove || this.openDirection === 'below' || this.openDirection === 'bottom') {
        this.preferredOpenDirection = 'below';
        this.optimizedHeight = Math.min(spaceBelow - 40, this.maxHeight);
      } else {
        this.preferredOpenDirection = 'above';
        this.optimizedHeight = Math.min(spaceAbove - 40, this.maxHeight);
      }
    }
  }
};

var pointerMixin = {
  data () {
    return {
      pointer: 0,
      pointerDirty: false
    }
  },
  props: {
    /**
     * Enable/disable highlighting of the pointed value.
     * @type {Boolean}
     * @default true
     */
    showPointer: {
      type: Boolean,
      default: true
    },
    optionHeight: {
      type: Number,
      default: 40
    }
  },
  computed: {
    pointerPosition () {
      return this.pointer * this.optionHeight
    },
    visibleElements () {
      return this.optimizedHeight / this.optionHeight
    }
  },
  watch: {
    filteredOptions () {
      this.pointerAdjust();
    },
    isOpen () {
      this.pointerDirty = false;
    },
    pointer () {
      this.$refs.search && this.$refs.search.setAttribute('aria-activedescendant', this.id + '-' + this.pointer.toString());
    }
  },
  methods: {
    optionHighlight (index, option) {
      return {
        'multiselect__option--highlight': index === this.pointer && this.showPointer,
        'multiselect__option--selected': this.isSelected(option)
      }
    },
    groupHighlight (index, selectedGroup) {
      if (!this.groupSelect) {
        return [
          'multiselect__option--disabled',
          {'multiselect__option--group': selectedGroup.$isLabel}
        ]
      }

      const group = this.options.find((option) => {
        return option[this.groupLabel] === selectedGroup.$groupLabel
      });

      return group && !this.wholeGroupDisabled(group) ? [
        'multiselect__option--group',
        {'multiselect__option--highlight': index === this.pointer && this.showPointer},
        {'multiselect__option--group-selected': this.wholeGroupSelected(group)}
      ] : 'multiselect__option--disabled'
    },
    addPointerElement ({key} = 'Enter') {
      /* istanbul ignore else */
      if (this.filteredOptions.length > 0) {
        this.select(this.filteredOptions[this.pointer], key);
      }
      this.pointerReset();
    },
    pointerForward () {
      /* istanbul ignore else */
      console.log(this.pointer, this.filteredOptions.length);
      if (this.pointer < this.filteredOptions.length - 1) {
        this.pointer++;
        /* istanbul ignore next */
        if (this.$refs.list.scrollTop <= this.pointerPosition - (this.visibleElements - 1) * this.optionHeight) {
          this.$refs.list.scrollTop = this.pointerPosition - (this.visibleElements - 1) * this.optionHeight;
        }
        /* istanbul ignore else */
        if (
          this.filteredOptions[this.pointer] &&
          this.filteredOptions[this.pointer].$isLabel &&
          !this.groupSelect
        ) this.pointerForward();
      }
      this.pointerDirty = true;
    },
    pointerBackward () {
      if (this.pointer > 0) {
        this.pointer--;
        /* istanbul ignore else */
        if (this.$refs.list.scrollTop >= this.pointerPosition) {
          this.$refs.list.scrollTop = this.pointerPosition;
        }
        /* istanbul ignore else */
        if (
          this.filteredOptions[this.pointer] &&
          this.filteredOptions[this.pointer].$isLabel &&
          !this.groupSelect
        ) this.pointerBackward();
      } else {
        /* istanbul ignore else */
        if (
          this.filteredOptions[this.pointer] &&
          this.filteredOptions[0].$isLabel &&
          !this.groupSelect
        ) this.pointerForward();
      }
      this.pointerDirty = true;
    },
    pointerReset () {
      /* istanbul ignore else */
      if (!this.closeOnSelect) return
      this.pointer = 0;
      /* istanbul ignore else */
      if (this.$refs.list) {
        this.$refs.list.scrollTop = 0;
      }
    },
    pointerAdjust () {
      /* istanbul ignore else */
      if (this.pointer >= this.filteredOptions.length - 1) {
        this.pointer = this.filteredOptions.length
          ? this.filteredOptions.length - 1
          : 0;
      }

      if (this.filteredOptions.length > 0 &&
        this.filteredOptions[this.pointer].$isLabel &&
        !this.groupSelect
      ) {
        this.pointerForward();
      }
      this.pointerDirty = true;
    },
    pointerSet (index) {
      this.pointer = index;
      this.pointerDirty = true;
    }
  }
};

var script = {
  name: 'vue-multiselect',
  mixins: [multiselectMixin, pointerMixin],
  compatConfig: {
    MODE: 3,
    ATTR_ENUMERATED_COERCION: false
  },
  props: {
    /**
       * name attribute to match optional label element
       * @default ''
       * @type {String}
       */
    name: {
      type: String,
      default: ''
    },
    /**
       * Presets the selected options value.
       * @type {Object||Array||String||Integer}
       */
    modelValue: {
      type: null,
      default () {
        return []
      }
    },
    /**
       * String to show when pointing to an option
       * @default 'Press enter to select'
       * @type {String}
       */
    selectLabel: {
      type: String,
      default: 'Press enter to select'
    },
    /**
       * String to show when pointing to an option
       * @default 'Press enter to select'
       * @type {String}
       */
    selectGroupLabel: {
      type: String,
      default: 'Press enter to select group'
    },
    /**
       * String to show next to selected option
       * @default 'Selected'
       * @type {String}
       */
    selectedLabel: {
      type: String,
      default: 'Selected'
    },
    /**
       * String to show when pointing to an already selected option
       * @default 'Press enter to remove'
       * @type {String}
       */
    deselectLabel: {
      type: String,
      default: 'Press enter to remove'
    },
    /**
       * String to show when pointing to an already selected option
       * @default 'Press enter to remove'
       * @type {String}
       */
    deselectGroupLabel: {
      type: String,
      default: 'Press enter to deselect group'
    },
    /**
       * Decide whether to show pointer labels
       * @default true
       * @type {Boolean}
       */
    showLabels: {
      type: Boolean,
      default: true
    },
    /**
       * Limit the display of selected options. The rest will be hidden within the limitText string.
       * @default 99999
       * @type {Integer}
       */
    limit: {
      type: Number,
      default: 99999
    },
    /**
       * Sets maxHeight style value of the dropdown
       * @default 300
       * @type {Integer}
       */
    maxHeight: {
      type: Number,
      default: 300
    },
    /**
       * Function that process the message shown when selected
       * elements pass the defined limit.
       * @default 'and * more'
       * @param {Int} count Number of elements more than limit
       * @type {Function}
       */
    limitText: {
      type: Function,
      default: (count) => `and ${count} more`
    },
    /**
       * Set true to trigger the loading spinner.
       * @default False
       * @type {Boolean}
       */
    loading: {
      type: Boolean,
      default: false
    },
    /**
       * Disables the multiselect if true.
       * @default false
       * @type {Boolean}
       */
    disabled: {
      type: Boolean,
      default: false
    },
    /**
       * Fixed opening direction
       * @default ''
       * @type {String}
       */
    openDirection: {
      type: String,
      default: ''
    },
    /**
       * Shows slot with message about empty options
       * @default true
       * @type {Boolean}
       */
    showNoOptions: {
      type: Boolean,
      default: true
    },
    showNoResults: {
      type: Boolean,
      default: true
    },
    tabindex: {
      type: Number,
      default: 0
    }
  },
  computed: {
    hasOptionGroup () {
      return this.groupValues && this.groupLabel && this.groupSelect
    },
    isSingleLabelVisible () {
      return (
        (this.singleValue || this.singleValue === 0) &&
          (!this.isOpen || !this.searchable) &&
          !this.visibleValues.length
      )
    },
    isPlaceholderVisible () {
      return !this.internalValue.length && (!this.searchable || !this.isOpen)
    },
    visibleValues () {
      return this.multiple ? this.internalValue.slice(0, this.limit) : []
    },
    singleValue () {
      return this.internalValue[0]
    },
    deselectLabelText () {
      return this.showLabels ? this.deselectLabel : ''
    },
    deselectGroupLabelText () {
      return this.showLabels ? this.deselectGroupLabel : ''
    },
    selectLabelText () {
      return this.showLabels ? this.selectLabel : ''
    },
    selectGroupLabelText () {
      return this.showLabels ? this.selectGroupLabel : ''
    },
    selectedLabelText () {
      return this.showLabels ? this.selectedLabel : ''
    },
    inputStyle () {
      if (
        this.searchable ||
          (this.multiple && this.modelValue && this.modelValue.length)
      ) {
        // Hide input by setting the width to 0 allowing it to receive focus
        return this.isOpen
          ? {width: '100%'}
          : {width: '0', position: 'absolute', padding: '0'}
      }
      return ''
    },
    contentStyle () {
      return this.options.length
        ? {display: 'inline-block'}
        : {display: 'block'}
    },
    isAbove () {
      if (this.openDirection === 'above' || this.openDirection === 'top') {
        return true
      } else if (
        this.openDirection === 'below' ||
          this.openDirection === 'bottom'
      ) {
        return false
      } else {
        return this.preferredOpenDirection === 'above'
      }
    },
    showSearchInput () {
      return (
        this.searchable &&
          (this.hasSingleSelectedSlot &&
            (this.visibleSingleValue || this.visibleSingleValue === 0)
            ? this.isOpen
            : true)
      )
    }
  }
};

const _hoisted_1 = ["tabindex", "aria-owns"];
const _hoisted_2 = {
  ref: "tags",
  class: "multiselect__tags"
};
const _hoisted_3 = { class: "multiselect__tags-wrap" };
const _hoisted_4 = ["textContent"];
const _hoisted_5 = ["onKeypress", "onMousedown"];
const _hoisted_6 = ["textContent"];
const _hoisted_7 = { class: "multiselect__spinner" };
const _hoisted_8 = ["name", "id", "placeholder", "value", "disabled", "tabindex", "aria-controls"];
const _hoisted_9 = ["id"];
const _hoisted_10 = { key: 0 };
const _hoisted_11 = { class: "multiselect__option" };
const _hoisted_12 = ["id", "role"];
const _hoisted_13 = ["onClick", "onMouseenter", "data-select", "data-selected", "data-deselect"];
const _hoisted_14 = ["data-select", "data-deselect", "onMouseenter", "onMousedown"];
const _hoisted_15 = { class: "multiselect__option" };
const _hoisted_16 = { class: "multiselect__option" };

function render(_ctx, _cache, $props, $setup, $data, $options) {
  return (openBlock(), createElementBlock("div", {
    tabindex: _ctx.searchable ? -1 : $props.tabindex,
    class: normalizeClass([{ 'multiselect--active': _ctx.isOpen, 'multiselect--disabled': $props.disabled, 'multiselect--above': $options.isAbove, 'multiselect--has-options-group': $options.hasOptionGroup }, "multiselect"]),
    onFocus: _cache[14] || (_cache[14] = $event => (_ctx.activate())),
    onBlur: _cache[15] || (_cache[15] = $event => (_ctx.searchable ? false : _ctx.deactivate('blur'))),
    onKeydown: [
      _cache[16] || (_cache[16] = withKeys(withModifiers($event => (_ctx.pointerForward()), ["self","prevent"]), ["down"])),
      _cache[17] || (_cache[17] = withKeys(withModifiers($event => (_ctx.pointerBackward()), ["self","prevent"]), ["up"])),
      _cache[18] || (_cache[18] = withKeys(withModifiers($event => (_ctx.addPointerElement($event)), ["prevent","stop","self"]), ["enter"])),
      _cache[19] || (_cache[19] = withKeys(withModifiers($event => (_ctx.addPointerElement($event)), ["stop","self"]), ["tab"]))
    ],
    onKeyup: _cache[20] || (_cache[20] = withKeys($event => (_ctx.deactivate('esc')), ["esc"])),
    role: "combobox",
    "aria-owns": 'listbox-'+_ctx.id
  }, [
    renderSlot(_ctx.$slots, "caret", { toggle: _ctx.toggle }, () => [
      createElementVNode("div", {
        onMousedown: _cache[0] || (_cache[0] = withModifiers($event => (_ctx.toggle('b')), ["prevent","stop"])),
        class: "multiselect__select"
      }, null, 32 /* NEED_HYDRATION */)
    ]),
    renderSlot(_ctx.$slots, "clear", { search: _ctx.search }),
    createElementVNode("div", _hoisted_2, [
      renderSlot(_ctx.$slots, "selection", {
        search: _ctx.search,
        remove: _ctx.removeElement,
        values: $options.visibleValues,
        isOpen: _ctx.isOpen
      }, () => [
        withDirectives(createElementVNode("div", _hoisted_3, [
          (openBlock(true), createElementBlock(Fragment, null, renderList($options.visibleValues, (option, index) => {
            return renderSlot(_ctx.$slots, "tag", {
              option: option,
              search: _ctx.search,
              remove: _ctx.removeElement
            }, () => [
              (openBlock(), createElementBlock("span", {
                class: "multiselect__tag",
                key: index
              }, [
                createElementVNode("span", {
                  textContent: toDisplayString(_ctx.getOptionLabel(option))
                }, null, 8 /* PROPS */, _hoisted_4),
                createElementVNode("i", {
                  tabindex: "1",
                  onKeypress: withKeys(withModifiers($event => (_ctx.removeElement(option)), ["prevent"]), ["enter"]),
                  onMousedown: withModifiers($event => (_ctx.removeElement(option)), ["prevent"]),
                  class: "multiselect__tag-icon"
                }, null, 40 /* PROPS, NEED_HYDRATION */, _hoisted_5)
              ]))
            ])
          }), 256 /* UNKEYED_FRAGMENT */))
        ], 512 /* NEED_PATCH */), [
          [vShow, $options.visibleValues.length > 0]
        ]),
        (_ctx.internalValue && _ctx.internalValue.length > $props.limit)
          ? renderSlot(_ctx.$slots, "limit", { key: 0 }, () => [
              createElementVNode("strong", {
                class: "multiselect__strong",
                textContent: toDisplayString($props.limitText(_ctx.internalValue.length - $props.limit))
              }, null, 8 /* PROPS */, _hoisted_6)
            ])
          : createCommentVNode("v-if", true)
      ]),
      createVNode(Transition, { name: "multiselect__loading" }, {
        default: withCtx(() => [
          renderSlot(_ctx.$slots, "loading", {}, () => [
            withDirectives(createElementVNode("div", _hoisted_7, null, 512 /* NEED_PATCH */), [
              [vShow, $props.loading]
            ])
          ])
        ]),
        _: 3 /* FORWARDED */
      }),
      (_ctx.searchable)
        ? (openBlock(), createElementBlock("input", {
            key: 0,
            ref: "search",
            name: $props.name,
            id: _ctx.id,
            type: "text",
            autocomplete: "off",
            spellcheck: false,
            placeholder: _ctx.placeholder,
            style: normalizeStyle($options.inputStyle),
            value: _ctx.search,
            disabled: $props.disabled,
            tabindex: $props.tabindex,
            onInput: _cache[1] || (_cache[1] = $event => (_ctx.updateSearch($event.target.value))),
            onFocus: _cache[2] || (_cache[2] = withModifiers($event => (_ctx.activate()), ["prevent"])),
            onBlur: _cache[3] || (_cache[3] = withModifiers($event => (_ctx.deactivate()), ["prevent"])),
            onKeyup: _cache[4] || (_cache[4] = withKeys($event => (_ctx.deactivate()), ["esc"])),
            onKeydown: [
              _cache[5] || (_cache[5] = withKeys(withModifiers($event => (_ctx.pointerForward()), ["prevent"]), ["down"])),
              _cache[6] || (_cache[6] = withKeys(withModifiers($event => (_ctx.pointerBackward()), ["prevent"]), ["up"])),
              _cache[7] || (_cache[7] = withKeys(withModifiers($event => (_ctx.addPointerElement($event)), ["prevent","stop","self"]), ["enter"])),
              _cache[8] || (_cache[8] = withKeys(withModifiers($event => (_ctx.addPointerElement($event)), ["stop","self"]), ["tab"])),
              _cache[9] || (_cache[9] = withKeys(withModifiers($event => (_ctx.removeLastElement()), ["stop"]), ["delete"]))
            ],
            class: "multiselect__input",
            "aria-controls": 'listbox-'+_ctx.id
          }, null, 44 /* STYLE, PROPS, NEED_HYDRATION */, _hoisted_8))
        : createCommentVNode("v-if", true),
      ($options.isSingleLabelVisible)
        ? (openBlock(), createElementBlock("span", {
            key: 1,
            class: "multiselect__single",
            onMousedown: _cache[10] || (_cache[10] = withModifiers($event => (_ctx.toggle('c')), ["prevent"]))
          }, [
            renderSlot(_ctx.$slots, "singleLabel", { option: $options.singleValue }, () => [
              createTextVNode(toDisplayString(_ctx.currentOptionLabel), 1 /* TEXT */)
            ])
          ], 32 /* NEED_HYDRATION */))
        : createCommentVNode("v-if", true),
      ($options.isPlaceholderVisible)
        ? (openBlock(), createElementBlock("span", {
            key: 2,
            class: "multiselect__placeholder",
            onMousedown: _cache[11] || (_cache[11] = withModifiers($event => (_ctx.toggle('d')), ["prevent"]))
          }, [
            renderSlot(_ctx.$slots, "placeholder", {}, () => [
              createTextVNode(toDisplayString(_ctx.placeholder), 1 /* TEXT */)
            ])
          ], 32 /* NEED_HYDRATION */))
        : createCommentVNode("v-if", true)
    ], 512 /* NEED_PATCH */),
    createVNode(Transition, {
      name: "multiselect",
      persisted: ""
    }, {
      default: withCtx(() => [
        withDirectives(createElementVNode("div", {
          class: "multiselect__content-wrapper",
          onFocus: _cache[12] || (_cache[12] = (...args) => (_ctx.activate && _ctx.activate(...args))),
          tabindex: "-1",
          onMousedown: _cache[13] || (_cache[13] = withModifiers(() => {}, ["prevent"])),
          style: normalizeStyle({ maxHeight: _ctx.optimizedHeight + 'px' }),
          ref: "list"
        }, [
          createElementVNode("ul", {
            class: "multiselect__content",
            style: normalizeStyle($options.contentStyle),
            role: "listbox",
            id: 'listbox-'+_ctx.id
          }, [
            renderSlot(_ctx.$slots, "beforeList"),
            (_ctx.multiple && _ctx.max === _ctx.internalValue.length)
              ? (openBlock(), createElementBlock("li", _hoisted_10, [
                  createElementVNode("span", _hoisted_11, [
                    renderSlot(_ctx.$slots, "maxElements", {}, () => [
                      createTextVNode("Maximum of " + toDisplayString(_ctx.max) + " options selected. First remove a selected option to select another.", 1 /* TEXT */)
                    ])
                  ])
                ]))
              : createCommentVNode("v-if", true),
            (!_ctx.max || _ctx.internalValue.length < _ctx.max)
              ? (openBlock(true), createElementBlock(Fragment, { key: 1 }, renderList(_ctx.filteredOptions, (option, index) => {
                  return (openBlock(), createElementBlock("li", {
                    class: "multiselect__element",
                    key: index,
                    id: _ctx.id + '-' + index,
                    role: !(option && (option.$isLabel || option.$isDisabled)) ? 'option' : null
                  }, [
                    (!(option && (option.$isLabel || option.$isDisabled)))
                      ? (openBlock(), createElementBlock("span", {
                          key: 0,
                          class: normalizeClass([_ctx.optionHighlight(index, option), "multiselect__option"]),
                          onClick: withModifiers($event => (_ctx.select(option)), ["stop"]),
                          onMouseenter: withModifiers($event => (_ctx.pointerSet(index)), ["self"]),
                          "data-select": option && option.isTag ? _ctx.tagPlaceholder : $options.selectLabelText,
                          "data-selected": $options.selectedLabelText,
                          "data-deselect": $options.deselectLabelText
                        }, [
                          renderSlot(_ctx.$slots, "option", {
                            option: option,
                            search: _ctx.search,
                            index: index
                          }, () => [
                            createElementVNode("span", null, toDisplayString(_ctx.getOptionLabel(option)), 1 /* TEXT */)
                          ])
                        ], 42 /* CLASS, PROPS, NEED_HYDRATION */, _hoisted_13))
                      : createCommentVNode("v-if", true),
                    (option && (option.$isLabel || option.$isDisabled))
                      ? (openBlock(), createElementBlock("span", {
                          key: 1,
                          "data-select": _ctx.groupSelect && $options.selectGroupLabelText,
                          "data-deselect": _ctx.groupSelect && $options.deselectGroupLabelText,
                          class: normalizeClass([_ctx.groupHighlight(index, option), "multiselect__option"]),
                          onMouseenter: withModifiers($event => (_ctx.groupSelect && _ctx.pointerSet(index)), ["self"]),
                          onMousedown: withModifiers($event => (_ctx.selectGroup(option)), ["prevent"])
                        }, [
                          renderSlot(_ctx.$slots, "option", {
                            option: option,
                            search: _ctx.search,
                            index: index
                          }, () => [
                            createElementVNode("span", null, toDisplayString(_ctx.getOptionLabel(option)), 1 /* TEXT */)
                          ])
                        ], 42 /* CLASS, PROPS, NEED_HYDRATION */, _hoisted_14))
                      : createCommentVNode("v-if", true)
                  ], 8 /* PROPS */, _hoisted_12))
                }), 128 /* KEYED_FRAGMENT */))
              : createCommentVNode("v-if", true),
            withDirectives(createElementVNode("li", null, [
              createElementVNode("span", _hoisted_15, [
                renderSlot(_ctx.$slots, "noResult", { search: _ctx.search }, () => [
                  createTextVNode("No elements found. Consider changing the search query.")
                ])
              ])
            ], 512 /* NEED_PATCH */), [
              [vShow, $props.showNoResults && (_ctx.filteredOptions.length === 0 && _ctx.search && !$props.loading)]
            ]),
            withDirectives(createElementVNode("li", null, [
              createElementVNode("span", _hoisted_16, [
                renderSlot(_ctx.$slots, "noOptions", {}, () => [
                  createTextVNode("List is empty.")
                ])
              ])
            ], 512 /* NEED_PATCH */), [
              [vShow, $props.showNoOptions && ((_ctx.options.length === 0 || ($options.hasOptionGroup === true && _ctx.filteredOptions.length === 0)) && !_ctx.search && !$props.loading)]
            ]),
            renderSlot(_ctx.$slots, "afterList")
          ], 12 /* STYLE, PROPS */, _hoisted_9)
        ], 36 /* STYLE, NEED_HYDRATION */), [
          [vShow, _ctx.isOpen]
        ])
      ]),
      _: 3 /* FORWARDED */
    })
  ], 42 /* CLASS, PROPS, NEED_HYDRATION */, _hoisted_1))
}

script.render = render;

export { script as Multiselect, script as default, multiselectMixin, pointerMixin };
