// A page translator (Chrome's built-in translate, and others) replaces the text nodes React wrote with its own
// <font> wrappers. React does not know, so the next time it inserts or removes something beside that text the
// node it expects is no longer where it left it, and the browser throws "Failed to execute 'insertBefore' on
// 'Node'" (React issue #11538). That took down whole screens — Arsenal for a member reading the app in Portuguese.
//
// This makes the two DOM calls forgiving in exactly that case and no other: an insert whose reference node has
// been wrapped goes in front of the wrapper (the spot React meant), one whose reference is gone entirely goes at
// the end, and removing a node that has already been moved out is a no-op. Normal calls are untouched.
export function guardDomForTranslators() {
  if (typeof Node !== "function" || !Node.prototype || Node.prototype.__mczGuarded) return;
  const proto = Node.prototype;
  const insertBefore = proto.insertBefore;
  const removeChild = proto.removeChild;
  proto.insertBefore = function guardedInsertBefore(node, ref) {
    if (ref && ref.parentNode !== this) {
      let r = ref;
      while (r && r.parentNode !== this) r = r.parentNode;   // the wrapper the translator put in its place
      return insertBefore.call(this, node, r || null);
    }
    return insertBefore.call(this, node, ref);
  };
  proto.removeChild = function guardedRemoveChild(child) {
    if (child && child.parentNode !== this) {
      let r = child;
      while (r && r.parentNode !== this) r = r.parentNode;
      return r ? removeChild.call(this, r) : child;          // remove the wrapper, or nothing if it is already gone
    }
    return removeChild.call(this, child);
  };
  proto.__mczGuarded = true;
}
