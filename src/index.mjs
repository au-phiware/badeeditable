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

function BadgeEditable(element, {validLabel, parser, onChange} = {}) {
    let activeBadge = null;
    let lastBadgeKey = 0;
    const badgeMap = new Map();
    let emit = null;

    if (!parser) {
        parser = {
            parse(text) {
                return text.split(',').map(s => s.trim() ? s.trim() : undefined)
            }
        };
    }

    if (!validLabel) {
        validLabel = 'primary';
    }

    if (onChange) {
        emit = onChange;
    }

    element.contentEditable = 'true';

    this.getBadges = function() {
        const data = [];
        for (let i = 0; i < element.childElementCount; i++) {
            const badgeKey = element.children[i].dataset.badgeKey;
            if (badgeMap.has(badgeKey)) {
                data.push(badgeMap.get(badgeKey));
            }
        }
        return data;
    };

    function makeChild(content) {
        const child = document.createElement('span');
        child.classList.add('badge', 'badge-empty');
        child.dataset.badgeKey = ++lastBadgeKey;
        if (content) {
            if ('string' === typeof content) {
                content = document.createTextNode(content);
            }
            child.appendChild(content);
        }
        content = document.createElement('br');
        child.appendChild(content);
        return child;
    }

    function updateBadge(node, data) {
        const badgeKey = node.dataset.badgeKey;
        if (data !== undefined) {
            let oldData = null;
            let type = 'add';
            if (badgeMap.has(badgeKey)) {
                oldData = badgeMap.get(badgeKey);
                type = 'change';
            }
            badgeMap.set(badgeKey, data);
            if (emit) emit(type, node, oldData, data);
            node.classList.add(`badge-${validLabel}`);
        } else {
            node.classList.remove(`badge-${validLabel}`);
            if (badgeMap.has(badgeKey)) {
                const oldData = badgeMap.get(badgeKey);
                badgeMap.delete(badgeKey);
                if (emit) emit('delete', node, oldData);
            }
            node.classList.add('badge-invalid');
        }
    }

    function activateBadge(node, collapse) {
        if (node === activeBadge) {
            return false;
        }
        if (activeBadge) {
            deactivateBadge(activeBadge);
        }
        if (collapse !== undefined) {
            window.getSelection().collapse(node, collapse);
        }
        node.classList.add('badge-active');
        activeBadge = node;
        return true;
    }

    function deactivateBadge(node, data) {
        node.classList.remove('badge-active');
        if (node === activeBadge) {
            activeBadge = null;
        }
        if (validateBadge(node, data)) {
            return enableBadge(node, data);
        }
        return null;
    }

    function validateBadge(node, data) {
        if (data === undefined) {
            const badgeKey = node.dataset.badgeKey;
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
                if (data === undefined || data.rawText !== textContent) {
                    try {
                        let items = parser.parse(textContent);
                        if (items.length !== 1) {
                            throw new Error('Illegal argument: node does not contain a single item');
                        }
                        data = items[0];
                        data.rawText = textContent;
                        updateBadge(node, data);
                        return true;
                    } catch {
                        if (data !== undefined) {
                            updateBadge(node);
                        }
                    }
                }
            }
            return false;
        } else if (data.rawText.trim() === '') {
            node.classList.add('badge-empty');
            return false;
        }
        return true;
    }

    function enableBadge(node, data) {
        let [before, after] = [makeChild(), makeChild()];
        if (!hasEmptyBadgeBefore(node)) {
            node.insertAdjacentElement('beforebegin', before);
        }
        if (!hasEmptyBadgeAfter(node)) {
            node.insertAdjacentElement('afterend', after);
        } else {
            after = node.nextElementSibling;
        }
        // TODO: Can this be any element or should we check for tagName==='BR'?
        if (!node.lastElementChild) {
            node.appendChild(document.createElement('br'));
        }
        return after;
    }

    element.addEventListener('focus', function focus(e) {
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
        // FIXME: This assumes selection.focusNode===selection.anchorNode
        const textContent = Array.from(anchorNode.textContent);
        textContent.splice(
            selection.anchorOffset,
            selection.focusOffset - selection.anchorOffset,
            e.key
        );
        anchorNode.textContent = textContent.join('');
        try {
            const allItems = parser.parse(scratch.textContent);
            const items = allItems.filter((d, i) => d !== undefined || i === allItems.length - 1);
            badge.classList.remove('badge-invalid');

            if (items.length > 1) {
                e.preventDefault();
                e.stopPropagation();

                // FIXME: This assumes items.length===2
                let collapse = 0;
                let data = items[0];
                data.rawText = badge.textContent;
                if (items[1] !== undefined) {
                    // FIXME: This assumes badge contains one text node
                    const offset = items[0].location && items[0].location.end && items[0].location.end.offset || selection.focusOffset;
                    const newText = badge.removeChild(badge.firstChild.splitText(offset));
                    data.rawText = badge.textContent;
                    const newChild = deactivateBadge(badge, data);
                    updateBadge(badge, data);
                    activateBadge(newChild, collapse);
                    collapse = undefined;
                    // newChild.firstChild is always <br>
                    newChild.insertBefore(newText, newChild.firstChild);
                    badge = newChild;
                    data = items[1];
                    data.rawText = badge.textContent;
                }
                const newChild = deactivateBadge(badge, data);
                updateBadge(badge, data);
                activateBadge(newChild, collapse);

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
    element.addEventListener('keyup', function keyup(e) {
        const selection = window.getSelection();
        const badge = getBadgeElement(selection.anchorNode);
        if (badge) {
            activateBadge(badge);
            if (validateBadge(badge)) {
                enableBadge(badge);
            }
        }
    });
    element.addEventListener('blur', function keyup(e) {
        if (activeBadge) {
            deactivateBadge(activeBadge);
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
