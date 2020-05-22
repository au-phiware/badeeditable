import { version } from '../package.json';

function makeChild(content) {
    const child = document.createElement('span');
    child.classList.add('badge', 'badge-empty');
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

function BadgeEditable(element, {validLabel, parser} = {}) {
    let activeBadge = null;

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

    element.contentEditable = 'true';

    function activateBadge(node, collapse) {
        if (node === activeBadge) {
            return
        }
        if (activeBadge) {
            deactivateBadge(activeBadge);
        }
        if (collapse !== undefined) {
            window.getSelection().collapse(node, collapse);
        }
        node.classList.add('badge-active');
        activeBadge = node;
    }

    function deactivateBadge(node) {
        node.classList.remove('badge-active');
        if (node === activeBadge) {
            activeBadge = null;
        }
        if (node.textContent.trim() !== '') {
            return enableBadge(node);
        }
        return null;
    }

    function enableBadge(node) {
        let [before, after] = [makeChild(), makeChild()];
        try {
            parser.parse(node.textContent);
            node.classList.add(`badge-${validLabel}`);
        } catch {}
        node.classList.remove('badge-empty');
        if (!hasEmptyBadgeBefore(node)) {
            node.insertAdjacentElement('beforebegin', before);
        }
        if (!hasEmptyBadgeAfter(node)) {
            node.insertAdjacentElement('afterend', after);
        } else {
            after = node.nextElementSibling;
        }
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
                if (items[1] !== undefined) {
                    // FIXME: This assumes badge contains one text node
                    const offset = items[0].location && items[0].location.end && items[0].location.end.offset || selection.focusOffset;
                    const newText = badge.firstChild.splitText(offset);
                    const newChild = deactivateBadge(badge);
                    activateBadge(newChild, collapse);
                    collapse = undefined;
                    // newChild.firstChild is always <br>
                    newChild.insertBefore(newText, newChild.firstChild);
                    badge = newChild;
                }
                const newChild = deactivateBadge(badge);
                activateBadge(newChild, collapse);

                return false;
            } else if (items.length !== allItems.length) {
                e.preventDefault();
                e.stopPropagation();
            }
        } catch {
            badge.classList.remove(`badge-${validLabel}`);
            badge.classList.add('badge-invalid');
            // TODO: store error message someplace
        }
    });
    element.addEventListener('keyup', function keyup(e) {
        const selection = window.getSelection();
        const badge = getBadgeElement(selection.anchorNode);
        if (badge) {
            activateBadge(badge);
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
