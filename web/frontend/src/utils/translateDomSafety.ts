// React's reconciler and a browser's own in-page translate feature (native
// "Translate this page", or any third-party widget) both mutate the same DOM
// nodes — the translator wraps/splits text nodes it translates, so a
// subsequent React re-render of that subtree can call
// removeChild/insertBefore on a node that's no longer where React last left
// it, throwing a real NotFoundError that would otherwise crash the whole
// app. This is the standard, widely-used mitigation for this exact
// React+page-translation conflict: swallow just that specific failure
// instead of letting it propagate, since losing one DOM patch is harmless
// but an uncaught exception here takes down the whole React tree.
export function patchDomForBrowserTranslate() {
  const originalRemoveChild = Node.prototype.removeChild;
  // @ts-expect-error — intentionally widening removeChild's signature to match the real DOM override below.
  Node.prototype.removeChild = function removeChild(child) {
    if (child.parentNode !== this) {
      if (console) console.warn('Cannot remove a child from a different parent', child, this);
      return child;
    }
    // @ts-expect-error — see above.
    return originalRemoveChild.apply(this, arguments);
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  // @ts-expect-error — see above.
  Node.prototype.insertBefore = function insertBefore(newNode, referenceNode) {
    if (referenceNode && referenceNode.parentNode !== this) {
      if (console) console.warn('Cannot insert before a reference node from a different parent', referenceNode, this);
      return newNode;
    }
    // @ts-expect-error — see above.
    return originalInsertBefore.apply(this, arguments);
  };
}
