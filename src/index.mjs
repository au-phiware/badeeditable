import { version } from '../package.json';

function getBadgeElement(node) {
    if (!node) {
        return;
    }
    if (node.nodeName === 'SPAN' && node.classList.contains('badge')) {
        return node;
    }
    return getBadgeElement(node.parentElement);
}

function hasEmptyBadgeAfter(node) {
    return node.nextElementSibling && node.nextElementSibling.classList.contains('badge-empty');
}

function hasEmptyBadgeBefore(node) {
    return node.previousElementSibling && node.previousElementSibling.classList.contains('badge-empty');
}

/**
 * Represents the user defined data associated to a badge within the {@link
 * BadgeEditable} input control.  These values are emitted by the control's
 * {@link Parser}.
 *
 * @typedef BadgeUserData
 * @property {String} text - the parsed text of this object
 * @property {Object} location - the location of the parsed text within the
 *     source text
 * @property {Object} location.start - the starting location of the parsed text
 * @property {Number} location.start.offset - the offset into the source text of
 *     the starting location
 * @property {Object} location.end - the ending location of the parsed text
 *     within the source text
 * @property {Number} location.end.offset - the offset into the source text of
 *     the ending location (exclusive)
 * @property {Node|SentinalGenerator} [sentinal] - a node or generator to be
 *     used for the badge element's sentinal
 */

/**
 * A Parser is responsible for converting the {@link BadgeEditable} input into
 * an array of [badge data]{@link BadgeUserData} objects.  These objects are
 * then associated to DOM elements within the {@link BadgeEditable} control.
 *
 * @typedef Parser
 * @function
 * @param {String} source - text to be parsed into [badge data]{@link
 *     BadgeUserData} objects
 * @returns {Array.<BadgeUserData>} An array of [badge data]{@link BadgeUserData}
 *     objects.
 */

/**
 * A SentinalGenerator is used to create a sentinal element, which is the last
 * element within a badge element.
 *
 * A sentinal element is needed to ensure that the badge elements interact with
 * the keyboard correctly.  The default SentinalGenerator creates a new
 * HTMLBRElement.
 *
 * @typedef SentinalGenerator
 * @function
 * @returns {Node} The child element to be appended to newly created badge
 *     elements.
 */

/**
 * Splits specified source text by comma into {@link BadgeUserData} objects.
 * The {@link BadgeUserData.location} and {@link BadgeUserData.text} of the
 * returned objects omit the comma.
 *
 * Default {@link Parser} used by {@link BadgeEditable}.
 *
 * @example
 * CommaSeparatedParser("foo, bar")
 * // => [
 * //    {
 * //         text: "foo",
 * //         location: {
 * //             start: {offset: 0},
 * //             end: {offset: 3}
 * //         }
 * //    },
 * //    {
 * //         text: "bar",
 * //         location: {
 * //             start: {offset: 4},
 * //             end: {offset: 8}
 * //         }
 * //    }
 * // ]
 * @see Parser
 * @function CommaSeparatedParser
 * @param {String} source - text to be parsed
 * @returns {Array.<BadgeUserData>} An array of data objects.
 */
const CommaSeparatedParser = function CommaSeparatedParser(source) {
    let values = [];
    let offset = 0;
    for (let i = source.indexOf(','); i > 0; i = source.indexOf(',')) {
        values.push({
            location: {
                start: {offset},
                end: {offset: offset + i},
            },
            text: source.substring(0, i),
        });

        source = source.substring(i + 1);
        offset += i + 1;
    }
    values.push({
        location: {
            start: {offset},
            end: {offset: offset + source.length},
        },
        text: source,
    });
    return values;
}

/**
 * Represents the data associated to a badge within the {@link BadgeEditable}
 * input control.  These values are used internally to keep record the state of
 * each badge.
 *
 * @typedef BadgeData
 * @property {BadgeUserData} value - the data object emitted by the
 *     {@link BadgeEditable}'s [parser]{@link Parser}.
 * @property {String} textContent - the last known text content of the badge's
 *     element.
 * @property {String} [rawText] - the input as entered from the keyboard (may be
 *     different from {@link BadgeData.value.text})
 * @property {function|Node} [sentinal] - the last DOM element (or
 *     generator thereof) of the badge's DOM element.
 * @private
 */

/**
 * Receives the user defined data, DOM element and unique key of a badge within
 * a BadgeEditable control.
 *
 * @callback BadgeEditable~BadgeCallback
 * @param {BadgeUserData} badge - user defined data
 * @param {Element} node - in the DOM of the badge
 * @param {Number} key - a unique key (with in the BadgeEditable control) of the
 *     badge.
 */

/**
 * Fires whenever a badge is added, deleted or changed.
 *
 * @event BadgeEditable#change
 * @type {Array.<ChangeEvent>}
 */
/**
 * Event object for [change events]{@link BadgeEditable#change}.
 *
 * @typedef ChangeEvent
 * @property {String} type - one of 'add', 'delete' or 'change'.
 * @property {Node} node - the badge element.
 * @property {BadgeUserData} [value] - the user defined badge data object for a
 *     badge being added or changed.
 * @property {BadgeUserData} [previousValue] - the user defined badge data
 *     object for auser defined badge data object for a badge being deleted or
 *     changed.
 */

/**
 * Constructs a new BadgeEditable attached to element.
 *
 * @param {HTMLElement} element - The element to which this BadgeEditable is
 *     attached.  This element (typically a div) will automatically have
 *     contenteditable attribute turned on (if it isn't already) and attach
 *     event listeners as needed.
 * @param {Object} [options]
 * @param {String} [options.validLabel='primary'] - class name to add to valid
 *     badges
 * @param {function} [options.onChange] - called when a badge value changes, is
 *     added or removed, defaults to a no-op.
 * @param {Parser} [options.parser.parse=CommaSeparatedParser] - used to
 *     recognise valid badges
 * @param {SentinalGenerator} [optional.makeSentinal] - generates a sentinal
 *     element for new and prospective badge elements, default creates new
 *     HTMLBRElements.
 *
 * @constructor
 */
function BadgeEditable(
    element,
    {
        validLabel = 'primary',
        onChange = null,
        parser = { parse: CommaSeparatedParser },
        makeSentinal = () => document.createElement('br'),
    } = {}) {
    /**
     * Contains the node the user is currently editing.
     *
     * @type {Element}
     * @inner
     * @private
     */
    let activeNode = null;
    /**
     * Contains the last badgeKey that was created.  badgeKeys start at 1 and
     * are incremented by one.  The current value will be the last badgeKey that
     * was generated.
     *
     * @type {Number}
     * @inner
     * @private
     */
    let badgeKeySequence = 0;
    /**
     * Contains data for every badge.
     *
     * @type {Map.<Number, BadgeData>}
     * @inner
     * @private
     */
    const badgeMap = new Map();
    /**
     * Called when a badge value changes, added or removed.
     *
     * @type {function}
     * @inner
     * @private
     */
    const emit = onChange;

    element.contentEditable = 'true';

    /**
     * Number of badges in this BadgeEditable control.
     *
     * @member {Number}
     */
    function length() {
        return badgeMap.size;
    }

    /**
     * `true` when this control is the active element in its document, `false`
     * otherwise.
     *
     * @member {Boolean}
     */
    function isActive() {
        return element.ownerDocument.activeElement === element;
    }

    /**
     * Calls the specified callback for each badge in this control.
     *
     * @param {BadgeEditable~BadgeCallback} callback - called for each badge
     */
    function forEach(callback) {
        for (let i = 0; i < element.childElementCount; i++) {
            const child = element.children[i];
            const badgeKey = Number(child.dataset.badgeKey);
            if (badgeMap.has(badgeKey)) {
                callback(badgeMap.get(badgeKey).value, child, badgeKey);
            }
        }
    }

    /**
     * The user defined data objects for each badge in this control.
     *
     * @member {Array.<BadgeUserData>}
     * @fires BadgeEditable#change
     */
    function value() {
        const data = [];
        this.forEach((badge, node, key) => {
            data.push(Object.assign({key}, badge));
        });
        return data;
    }
    function valueSetter(value) {
        const changes = [];
        this.forEach((previousValue, node) => {
            changes.push({type: 'delete', node, previousValue});
            element.removeChild(node);
        });
        badgeMap.clear();
        for (const node of element.querySelectorAll('.badge-empty')) {
            element.removeChild(node);
        }
        value.forEach(value => {
            const textContent = 'text' in value ? value.text : value.toString();
            const node = makeChild(textContent)
            const badgeKey = Number(node.dataset.badgeKey);
            const data = {value, textContent};
            node.classList.remove('badge-invalid');
            node.classList.add(`badge-${validLabel}`);
            element.appendChild(node);
            badgeMap.set(badgeKey, data);
            enableBadge(node, data);
            changes.push({type: 'add', node, value});
        });
        if (emit) emit(changes);
    }

    /**
     * The text content of this BadgeEditable control.
     *
     * This is a writable property and will initiate this BadgeEditable's
     * [parser]{@link Parser}.
     *
     * @member {String}
     */
    function textContent() {
        let textContent = '';
        this.forEach(badge => {
            textContent += 'rawText' in badge
                ? badge.rawText : badge.textContent;
        });
        return textContent;
    }
    function textContentSetter(textContent) {
        const allItems = parser.parse(textContent);
        const items = allItems.filter(d => d !== undefined);
        this.value = items;
    }

    Object.defineProperties(this, {
        length: {get: length},
        isActive: {get: isActive},
        forEach: {value: forEach},
        value: {
            get: value,
            set: valueSetter
        },
        textContent: {
            get: textContent,
            set: textContentSetter
        },
    });

    /**
     * Manufactures a new DOM element for a badge.  This is called when
     * inserting a badge or when a new insertion point is required in the
     * control.
     *
     * To ensure that the DOM element interacts with the keyboard correctly the
     * last element inside the returned element is a HTMLBRElement.
     *
     * @returns {HTMLElement} Element of the badge.
     * @param {String} [content=null] - the text content of an existing badge,
     *     otherwise the returned node will be ready for user input
     * @inner
     * @private
     */
    function makeChild(content=null) {
        const child = document.createElement('span');
        child.dataset.badgeKey = String(++badgeKeySequence);
        child.classList.add('badge');
        if (content) {
            if ('string' === typeof content) {
                content = document.createTextNode(content);
            }
            child.appendChild(content);
        } else {
            child.classList.add('badge-empty');
        }
        content = makeSentinal();
        child.appendChild(content);
        return child;
    }

    /**
     * To ensure that the DOM element interacts with the keyboard correctly this
     * function appends a sentinal element to the specified node.  If the
     * specified data object has a sentinal element then that is used.  If the
     * sentinal on the data object is a SentinalGenerator then it is used to
     * generate a node.  Regardless of how the sentinal is obtained, it is
     * assigned to the specified data object.
     *
     * @param {Node} node - the node to which the sentinal is to be appended
     * @param {BadgeData} data - the data of the badge
     * @returns {Node} The appended sentinal node.
     * @inner
     * @private
     */
    function addSentinal(node, data) {
        const value = data.value;
        const sentinal = value.sentinal
            ? typeof value.sentinal === 'function'
            ? value.sentinal() : value.sentinal : makeSentinal();
        node.appendChild(sentinal);
        data.sentinal = sentinal;
        return sentinal;
    }

    /**
     * Updates a badge's DOM element and data.
     *
     * @param {Node} node - of the badge
     * @param {BadgeData} data object of the badge
     * @fires BadgeEditable#change
     */
    function updateBadge(node, data=undefined) {
        const badgeKey = Number(node.dataset.badgeKey);
        if (data !== undefined) {
            const e = {
                type: 'add',
                node,
                value: data.value,
            };
            if (badgeMap.has(badgeKey)) {
                e.previousValue = badgeMap.get(badgeKey).value;
                e.type = 'change';
            }
            badgeMap.set(badgeKey, data);
            node.classList.remove('badge-invalid');
            node.classList.add(`badge-${validLabel}`);
            if (emit) emit([e]);
        } else {
            node.classList.remove(`badge-${validLabel}`);
            node.classList.add('badge-invalid');
            if (badgeMap.has(badgeKey)) {
                const previousValue = badgeMap.get(badgeKey).value;
                badgeMap.delete(badgeKey);
                if (emit) emit([{
                    type: 'delete',
                    node,
                    previousValue,
                }]);
            }
        }
    }

    function activateBadge(node, collapse=undefined) {
        if (node === activeNode) {
            return false;
        }
        if (activeNode) {
            deactivateBadge(activeNode);
        }
        if (collapse !== undefined) {
            // FIXME: This assumes there is one text node as the first child
            window.getSelection().collapse(node.firstChild, collapse);
        }
        node.classList.add('badge-active');
        activeNode = node;
        return true;
    }

    function deactivateBadge(node, data=undefined) {
        node.classList.remove('badge-active');
        if (node === activeNode) {
            activeNode = null;
        }
        if (validateBadge(node, data)) {
            return enableBadge(node, data);
        }
        return null;
    }

    function validateBadge(node, data=undefined) {
        if (data === undefined) {
            const badgeKey = Number(node.dataset.badgeKey);
            if (badgeMap.has(badgeKey)) {
                data = badgeMap.get(badgeKey);
            }
            const textContent = node.textContent;
            if (textContent.trim() === '') {
                node.classList.add('badge-empty');
                if (data !== undefined) {
                    updateBadge(node);
                }
            } else {
                node.classList.remove('badge-empty');
                if (data === undefined || data.textContent !== textContent) {
                    try {
                        let items = parser.parse(textContent);
                        if (items.length !== 1) {
                            throw new Error('Illegal argument: node does not contain a single item');
                        }
                        updateBadge(node, {value: items[0], textContent});
                        return true;
                    } catch {
                        if (data !== undefined) {
                            updateBadge(node);
                        }
                    }
                }
            }
            return false;
        } else if (data.textContent.trim() === '') {
            node.classList.add('badge-empty');
            return false;
        } else {
            node.classList.remove('badge-empty');
        }
        return true;
    }

    function enableBadge(node, data=undefined) {
        let [before, after] = [makeChild(), makeChild()];
        if (!hasEmptyBadgeBefore(node)) {
            node.insertAdjacentElement('beforebegin', before);
        }
        if (!hasEmptyBadgeAfter(node)) {
            node.insertAdjacentElement('afterend', after);
        } else {
            after = node.nextElementSibling;
        }
        const badgeKey = Number(node.dataset.badgeKey);
        const lastChild = node.lastElementChild;
        if (!lastChild) {
            if (!data) {
                data = badgeMap.has(badgeKey)
                    ? badgeMap.get(badgeKey) : {value:{}, textContent: ''};
            }
            addSentinal(node, data);
        } else if(data || badgeMap.has(badgeKey)) {
            if (!data) {
                data = badgeMap.has(badgeKey)
                    ? badgeMap.get(badgeKey) : {value:{}, textContent: ''};
            }
            if (data.sentinal !== data.value.sentinal) {
                node.removeChild(lastChild);
                addSentinal(node, data);
            }
        }
        return after;
    }

    element.addEventListener('focus', function focus() {
        const selection = window.getSelection();
        const anchorElement = selection.anchorNode;
        if (anchorElement !== getBadgeElement(anchorElement)) {
            // TODO: place cursor at the end of the last invalid badge,
            // otherwise create a new badge
            if (element.childElementCount === 0) {
                element.appendChild(makeChild());
            }
            activateBadge(element.lastElementChild, 0);
        } else {
            // anchorNode is not always correct at this point
            setTimeout(() => activateBadge(getBadgeElement(selection.anchorNode)), 2);
        }
    });
    element.addEventListener('keydown', function keydown(e) {
        if (e.key.length !== 1) {
            return;
        }

        const selection = window.getSelection();
        let badge = getBadgeElement(selection.anchorNode);

        if (!badge) {
            return;
        }

        const scratch = badge.cloneNode(true);
        const i = Array.from(badge.childNodes).findIndex(n => n===selection.anchorNode);
        const anchorNode = scratch.childNodes[i] || scratch;
        const focusOffset = selection.focusOffset;
        // FIXME: This assumes selection.focusNode===selection.anchorNode
        const textContent = Array.from(anchorNode.textContent);
        textContent.splice(
            selection.anchorOffset,
            selection.focusOffset - selection.anchorOffset,
            e.key
        );
        anchorNode.textContent = textContent.join('');
        try {
            const text = scratch.textContent;
            const allItems = parser.parse(text);
            const items = allItems.filter((d, i) => d !== undefined || i === allItems.length - 1);
            badge.classList.remove('badge-invalid');

            if (items.length > 1) {
                e.preventDefault();
                e.stopPropagation();

                // FIXME: This assumes items.length===2
                let data = {
                    value: items[0],
                    textContent: badge.textContent,
                    rawText: text,
                };
                let activate = () => {
                    if (activeNode) {
                        const newChild = deactivateBadge(activeNode, data);
                        activateBadge(newChild, 0);
                    }
                };
                if (items[1] !== undefined) {
                    // FIXME: This assumes badge contains one text node
                    let loc = data.value.location;
                    let offset = focusOffset;
                    if (loc && loc.end && 'offset' in loc.end) {
                        if (offset <= loc.end.offset) {
                            const collapse = offset + 1;
                            const currentBadge = badge;
                            activate = () => {
                                deactivateBadge(badge, data);
                                activateBadge(currentBadge, collapse);
                            };
                        }
                        offset = loc.end.offset;
                    }
                    const newText = badge.removeChild(badge.firstChild.splitText(offset));
                    if (data.value.text) {
                        badge.textContent = data.textContent = data.value.text;
                    } else {
                        badge.textContent = data.textContent = text.substring(0, offset);
                    }
                    loc = items[1].location;
                    if (loc && loc.start && 'offset' in loc.start) {
                        data.rawText = text.substring(0, loc.start.offset);
                    }
                    updateBadge(badge, data);
                    const newChild = deactivateBadge(badge, data);
                    // newChild.firstChild is always the sentinal
                    newChild.insertBefore(newText, newChild.firstChild);
                    badge = newChild;
                    data = {
                        value: items[1],
                        textContent: badge.textContent,
                    };
                    enableBadge(badge, data);
                    if (loc && loc.start && 'offset' in loc.start) {
                        data.rawText = text.substring(loc.start.offset);
                        if (loc && loc.end && 'offset' in loc.end) {
                            if (loc.start.offset <= focusOffset && focusOffset <= loc.end.offset) {
                                const collapse = focusOffset + 1 - loc.start.offset;
                                const currentBadge = badge;
                                activate = () => {
                                    activateBadge(currentBadge, collapse);
                                };
                            }
                        }
                    }
                }
                if (data.value.text) {
                    badge.textContent = data.textContent = data.value.text;
                }
                updateBadge(badge, data);
                activate();

                return false;
            } else if (items.length !== allItems.length) {
                e.preventDefault();
                e.stopPropagation();
            }
        } catch {
            updateBadge(badge);
            // TODO: store error message someplace
        }
    });
    element.addEventListener('keyup', function keyup() {
        const selection = window.getSelection();
        const badge = getBadgeElement(selection.anchorNode);
        if (badge) {
            activateBadge(badge);
            if (validateBadge(badge)) {
                enableBadge(badge);
            }
        }
    });
    element.addEventListener('blur', function keyup() {
        if (activeNode) {
            deactivateBadge(activeNode);
        }
    });
}

BadgeEditable.version = version;

BadgeEditable.onLoad = () => {
    document.querySelectorAll('[badgeeditable]').forEach(element => {
        new BadgeEditable(element);
    });
};

export default BadgeEditable;
