import { createContext, useContext, useState, useCallback } from "react";

// A global "open a post" channel. Any component can call openPost(post) and the
// post opens in a modal overlay that persists over whatever page is underneath —
// navigating the page below never dismisses it (only closing the modal does).
const PostModalContext = createContext(null);

export function PostModalProvider({ children }) {
  const [post, setPost] = useState(null);
  const openPost = useCallback((p) => setPost(p || null), []);
  const closePost = useCallback(() => setPost(null), []);
  return (
    <PostModalContext.Provider value={{ post, openPost, closePost }}>
      {children}
    </PostModalContext.Provider>
  );
}

export function usePostModal() {
  return useContext(PostModalContext) || { post: null, openPost: () => {}, closePost: () => {} };
}
