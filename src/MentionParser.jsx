import { useCallback } from "react";
import { usePostModal } from "./mcz2/PostModalContext.jsx";

export function useMentionHandlers() {
  const { openPost } = usePostModal ? usePostModal() : { openPost: () => {} };

  const goToProfile = useCallback((username) => {
    const event = new CustomEvent("mcz-goto-profile", { detail: username });
    window.dispatchEvent(event);
  }, []);

  const goToPost = useCallback((postId) => {
    openPost?.(postId);
  }, [openPost]);

  return { goToProfile, goToPost };
}

export function parseMentions(text) {
  if (!text) return [];

  const parts = [];
  const mentionRegex = /@(\w+)|post:#?(\w+)|#(\w+)/g;
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }

    if (match[1]) {
      parts.push({ type: "mention", value: match[1] });
    } else if (match[2]) {
      parts.push({ type: "post", value: match[2] });
    } else if (match[3]) {
      parts.push({ type: "hashtag", value: match[3] });
    }

    lastIndex = mentionRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }

  return parts;
}

export default function MentionText({ text, onMention, onPost, onHashtag }) {
  const { goToProfile, goToPost } = useMentionHandlers();

  const parts = parseMentions(text);
  if (parts.length === 0) return text;

  return (
    <>
      {parts.map((part, i) => {
        if (part.type === "text") {
          return <span key={i}>{part.value}</span>;
        }
        if (part.type === "mention") {
          return (
            <button
              key={i}
              onClick={() => {
                onMention?.(part.value);
                goToProfile(part.value);
              }}
              className="font-semibold text-mcz-cyan hover:underline active:scale-95 transition"
              title={`View ${part.value}'s profile`}
            >
              @{part.value}
            </button>
          );
        }
        if (part.type === "post") {
          return (
            <button
              key={i}
              onClick={() => {
                onPost?.(part.value);
                goToPost(part.value);
              }}
              className="font-semibold text-mcz-pink hover:underline active:scale-95 transition"
              title="View this post"
            >
              post:#{part.value}
            </button>
          );
        }
        if (part.type === "hashtag") {
          return (
            <button
              key={i}
              onClick={() => onHashtag?.(part.value)}
              className="font-semibold text-mcz-gold hover:underline active:scale-95 transition"
              title={`Search #${part.value}`}
            >
              #{part.value}
            </button>
          );
        }
        return null;
      })}
    </>
  );
}
