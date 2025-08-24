
import 'url-search-params-polyfill';
import 'core-js/web/url-search-params';
import 'core-js/stable';
import 'regenerator-runtime/runtime';
import 'core-js/modules/web.dom-collections.for-each'; // forEach para NodeList
import 'core-js/modules/web.dom-collections.iterator'; // Iteradores
import 'whatwg-fetch';
import 'element-closest-polyfill';

Object.setPrototypeOf(window.NodeList.prototype, window.Array.prototype);

const rectPrototype = Object.getPrototypeOf(document.documentElement.getBoundingClientRect());
Object.defineProperty(rectPrototype, 'x', { get() { return this.left; } });
Object.defineProperty(rectPrototype, 'y', { get() { return this.top; } })
