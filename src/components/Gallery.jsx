// A member's gallery: the images in their PUBLIC posts, newest first, from
// /api/economy/gallery/<username>/. It stores nothing of its own — each picture belongs
// to a post, and that post is where its likes, ratings, comments, shares and other-app
// doors are, so every tile opens it. The server decides what is in it (public posts
// only, and an under-18 member's gallery stays off the open internet).
//
// Others see nothing when it is empty or the fetch failed: an empty "Gallery" heading on
// somebody else's profile reads as a broken feature. The member's own profile (`mine`)
// says how a picture gets here instead, with the door that does it.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Images, X } from "lucide-react";
import { api } from "../api.js";
import { goToSpot } from "../goto.js";

export default function Gallery({ username, mine = false, auth = true }) {
  const [images, setImages] = useState(null);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    if (!username) return;
    api(`/api/economy/gallery/${encodeURIComponent(username)}/`, { auth })
      .then((d) => setImages(Array.isArray(d?.images) ? d.images : []))
      .catch(() => setImages(null));
  }, [username, auth]);

  useEffect(() => {
    if (!open) return;
    const esc = (e) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);

  if (!images) return null;
  if (images.length === 0) {
    if (!mine) return null;
    return (
      <div className="space-y-1" data-tour="gallery">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-white/40"><Images size={12} /> Gallery</p>
        <p className="text-xs text-white/55">
          Images you post publicly show here, each opening its post.{" "}
          <button className="re-link" onClick={() => goToSpot("filez", "filez-list")}>Post one from FileZ</button>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5" data-tour="gallery">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-white/40">
        <Images size={12} /> Gallery <span className="font-normal normal-case tracking-normal text-white/30">· {images.length}</span>
      </p>
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
        {images.map((im, i) => (
          <button key={`${im.post_id}-${i}`} type="button" onClick={() => setOpen(im)}
                  className="aspect-square overflow-hidden rounded-lg bg-black/30 ring-1 ring-white/10 hover:ring-mcz-cyan/60"
                  title={im.title}>
            <img src={im.url} alt={im.title || "Gallery image"} loading="lazy" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
      {mine && <p className="text-[11px] text-white/35">Your public posts' images. Members-only and private posts stay out of it.</p>}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" onClick={() => setOpen(null)}
             role="dialog" aria-label={open.title || "Gallery image"}>
          <div className="w-full max-w-2xl space-y-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-semibold text-white">{open.title}</p>
              <button className="rounded p-1.5 text-white/60 hover:bg-white/10 hover:text-white" aria-label="Close" onClick={() => setOpen(null)}>
                <X size={16} />
              </button>
            </div>
            <img src={open.url} alt={open.title || ""} className="max-h-[70vh] w-full rounded-lg object-contain" />
            <Link to={`/p/${open.post_id}`} className="re-link text-sm" onClick={() => setOpen(null)}>
              Open the post — like, rate, comment, share →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
