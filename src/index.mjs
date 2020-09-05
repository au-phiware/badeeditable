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

function BadgeEditable(
    // element is a node in the DOM (typically a div) that will be converted
    // into contenteditable element and used for the badge input
    element,
    {
        // validLabel will be used to add a class to badges that are valid,
        // defaults to 'primary'
        validLabel = 'primary',
        // onChange will be called when a badge value changes, is added or
        // removed, defaults to a no-op
        onChange,
        // parser is used to recognise valid badges, defaults to splitting on
        // commas
        parser = {
            parse(text) {
                let values = [];
                let offset = 0;
                for (let i = text.indexOf(','); i > 0; i = text.indexOf(',')) {
                    const trim = text.substring(0, i).trim();
                    const data = {
                        location: {
                            start: {offset},
                            end: {offset: offset + i},
                        },
                    };
                    if (trim) {
                        data.text = trim;
                    }
                    values.push(data);

                    text = text.substring(i + 1);
                    offset += i + 1;
                }
                const trim = text.trim();
                const data = {
                    location: {
                        start: {offset},
                        end: {offset: offset + text.length},
                    },
                };
                if (trim) {
                    data.text = trim;
                }
                values.push(data);
                return values;
            }
        },
    } = {}) {
    // activeNode contains the node the user is currently editing
    let activeNode = null;
    // badgeKeySequence contains the last badgeKey that was created
    // badgeKeys start at 1 (the sequence will be incremented before being used)
    let badgeKeySequence = 0;
    // badgeMap contains data for every badge with the following structure:
    //   {
    //     value: <any value that was emitted by the parser>,
    //     textContent: String<last known textContent of the badge node>,
    //     rawText: String<text passed to the parser>
    //     sentinal: Function|HtmlElement
    //   }
    const badgeMap = new Map();
    // emit will be called when a badge value changes, added or removed
    let emit = null;

    if (onChange) {
        emit = onChange;
    }

    element.contentEditable = 'true';

    Object.defineProperties(this, {
        length: {
            get() {
                return badgeMap.size;
            },
        },

        isActive: {
            get() {
                return element.ownerDocument.activeElement === element;
            },
        },

        forEach: {
            value(callback) {
                for (let i = 0; i < element.childElementCount; i++) {
                    const child = element.children[i];
                    const badgeKey = child.dataset.badgeKey;
                    if (badgeMap.has(badgeKey)) {
                        callback(badgeMap.get(badgeKey).value, child, badgeKey);
                    }
                }
            }
        },

        value: {
            get() {
                const data = [];
                this.forEach((badge, node, key) => {
                    data.push(Object.assign({key}, badge));
                });
                return data;
            },

            set(value) {
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
                    const badgeKey = node.dataset.badgeKey;
                    const data = {value, textContent};
                    node.classList.remove('badge-invalid');
                    node.classList.add(`badge-${validLabel}`);
                    element.appendChild(node);
                    badgeMap.set(badgeKey, data);
                    enableBadge(node, data);
                    changes.push({type: 'add', node, value});
                });
                if (emit) emit(changes);
            },
        },

        textContent: {
            set(textContent) {
                const allItems = parser.parse(textContent);
                const items = allItems.filter((d, i) => d !== undefined);
                this.value = items;
            },
        },
    });

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
        content = document.createElement('br');
        child.appendChild(content);
        return child;
    }

    function addSentinal(node, data) {
        const value = data.value;
        const sentinal = value.sentinal ? typeof value.sentinal === 'function' ? value.sentinal() : value.sentinal : document.createElement('br');
        node.appendChild(sentinal);
        data.sentinal = sentinal;
    }

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
                data = badgeMap.has(badgeKey) ? badgeMap.get(badgeKey) : {value:{}};
            }
            addSentinal(node, data);
        } else if(data || badgeMap.has(badgeKey)) {
            if (!data) {
                data = badgeMap.has(badgeKey) ? badgeMap.get(badgeKey) : {value:{}};
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
