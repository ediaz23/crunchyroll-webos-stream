
import 'core-js/stable';
import 'regenerator-runtime/runtime';
import 'url-search-params-polyfill';
import 'whatwg-fetch';


if (typeof window.NodeList.prototype[Symbol.iterator] !== 'function') {
    window.NodeList.prototype[Symbol.iterator] = window.Array.prototype[Symbol.iterator];
}

const arrayMethods = [
    'forEach', 'map', 'filter', 'reduce', 'some', 'every', 'find', 'includes'
];

arrayMethods.forEach(function(method) {
    if (!window.NodeList.prototype[method]) {
        window.NodeList.prototype[method] = window.Array.prototype[method];
    }
});

(function() {
    const originalGetBoundingClientRect = window.Element.prototype.getBoundingClientRect

    window.Element.prototype.getBoundingClientRect = function() {
        let rect = originalGetBoundingClientRect.call(this)

        rect.x = rect.left;
        rect.y = rect.top;
        return rect
    }
})();