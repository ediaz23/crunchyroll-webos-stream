
import 'url-search-params-polyfill';


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
