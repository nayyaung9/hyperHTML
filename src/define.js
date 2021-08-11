import { pascalToDash } from "./utils.js";

export function defineElement(tagName, hypers, omitProps) {
  console.log(tagName, hypers, omitProps);
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
