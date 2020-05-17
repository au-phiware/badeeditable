import './index.scss';

import { version } from '../package.json';
import onload from 'onload-function-stack';

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

function BadgeEditable(element) {
    let activeBadge = null;

    element.contentEditable = 'true';

    function activateBadge(node, collapse) {
        if (node === activeBadge) {
            return
        }
        if (activeBadge) {
            deactivateBadge(activeBadge);
        }
        if (collapse) {
            window.getSelection().collapse(node, 0);
        }
        node.classList.add('badge-active');
        activeBadge = node;
    }

    function deactivateBadge(node) {
        node.classList.remove('badge-active');
        if (node === activeBadge) {
            activeBadge = null;
        }
        if (node.innerText.trim() !== '') {
            return enableBadge(node);
        }
        return null;
    }

    function enableBadge(node) {
        if (node.classList.contains('badge-primary')) {
            return null;
        }
        const [before, after] = [makeChild(), makeChild()];
        node.classList.add('badge-primary');
        node.classList.remove('badge-empty');
        node.insertAdjacentElement('beforebegin', before);
        node.insertAdjacentElement('afterend', after);
        return after;
    }

    element.addEventListener('focus', function focus(e) {
        const selection = window.getSelection();
        const anchorElement = selection.anchorNode;
        if (anchorElement !== getBadgeElement(anchorElement)) {
            if (element.childElementCount === 0) {
                element.appendChild(makeChild());
            }
            activateBadge(element.lastElementChild, true);
        } else {
            activateBadge(anchorElement);
        }
    });
    element.addEventListener('keydown', function keydown(e) {
        if (e.key === ',') {
            e.preventDefault();
            e.stopPropagation();

            const selection = window.getSelection();
            const badge = getBadgeElement(selection.anchorNode);

            if (!badge) {
                return;
            }

            const newChild = deactivateBadge(badge);
            activateBadge(newChild, true);

            return false;
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

onload.add(() => {
    document.querySelectorAll('[badgeeditable]').forEach(element => {
        new BadgeEditable(element);
    });
})

export default BadgeEditable;
