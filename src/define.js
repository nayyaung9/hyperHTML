import { pascalToDash } from "./utils.js";

const defaultMethod = (host, value) => value;

export const callbacksMap = new WeakMap();
const propsMap = new WeakMap();

function translate(key, desc) {
  const type = typeof desc;

  let config;

  if (type === "function") {
    switch (key) {
      case "render":
        config = render(desc);
        break;
      case "content":
        config = render(desc, { shadowRoot: false });
        break;
      default:
        config = { get: desc };
    }
  } else if (type !== "object" || desc === null || Array.isArray(desc)) {
    // config = property(desc);
    config = desc;
  } else {
    config = {
      get: desc.get || defaultMethod,
      set: desc.set || (!desc.get && defaultMethod) || undefined,
      connect: desc.connect,
      observe: desc.observe,
    };
  }

  return config;
}

function compile(Hybrid, hybrids, omitProps = []) {
  Hybrid.hybrids = hybrids;

  const callbacks = [];
  const props = Object.keys(hybrids).filter((key) => !omitProps.includes(key));

  callbacksMap.set(Hybrid, callbacks);
  propsMap.set(Hybrid, props);

  props.forEach((key) => {
    const config = translate(key, hybrids[key]);

    Object.defineProperty(Hybrid.prototype, key, {
      get: function get() {
        return cache.get(this, key, config.get);
      },
      set:
        config.set &&
        function set(newValue) {
          cache.set(this, key, config.set, newValue);
        },
      enumerable: true,
      configurable: true,
    });

    if (config.observe) {
      callbacks.unshift((host) =>
        cache.observe(host, key, config.get, config.observe)
      );
    }

    if (config.connect) {
      callbacks.push((host) =>
        config.connect(host, key, (options) => {
          cache.invalidate(host, key, {
            force: options && options.force === true,
          });
        })
      );
    }
  });
}

export function defineElement(tagName, hypers, omitProps) {
  // console.log(tagName, hypers, omitProps);

  const type = typeof hypers;
  if (!hypers || type !== "object") {
    throw TypeError(`Second argument must be an object: ${type}`);
  }

  if (tagName !== null) {
    /**
     * The constructor for the named custom element, or undefined
     * if there is no custom element definition with that name.
     */
    const CustomElement = window.customElements.get(tagName);

    if (CustomElement) {
      return window.customElements.define(tagName, HTMLElement);
    }
  }

  class Hyper extends HTMLElement {
    constructor() {
      super();
    }
    connectedCallback() {}

    disconnectedCallback() {}
  }

  compile(Hyper, hypers, omitProps);

  if (tagName !== null) {
    Object.defineProperty(Hyper, "name", {
      get: () => tagName,
    });
    customElements.define(tagName, Hyper);
  }

  return Hyper;
}

function defineTagged(elements) {
  elements.forEach((hyper) => {
    if (typeof hyper.tag !== "string") {
      throw TypeError(`Tagged element must have a string tag ${hyper.tag}`);
    }
    defineElement(pascalToDash(hyper.tag), hyper, ["tag"]);
  }, {});

  return elements.length === 1 ? elements[0] : elements;
}

export default function define(...args) {
  if (typeof args[0] === "object" && args[0] !== null) {
    return defineTagged(args);
  }

  return defineElement(...args);
}
