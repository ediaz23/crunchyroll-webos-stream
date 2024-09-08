
import 'core-js/stable';
import 'regenerator-runtime/runtime';
import 'url-search-params-polyfill';


if (typeof window.NodeList.prototype[Symbol.iterator] !== 'function') {
    window.NodeList.prototype[Symbol.iterator] = window.Array.prototype[Symbol.iterator];
}
