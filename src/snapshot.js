(function () {
  "use strict";

  const documentClone = document.documentElement.cloneNode(true);
  const head = documentClone.querySelector("head") || documentClone.insertBefore(document.createElement("head"), documentClone.firstChild);
  const hasBase = Boolean(head.querySelector("base[href]"));

  if (!hasBase) {
    const base = document.createElement("base");
    base.setAttribute("href", document.baseURI || window.location.href);
    head.insertBefore(base, head.firstChild);
  }

  return `<!doctype html>\n${documentClone.outerHTML}`;
})();
