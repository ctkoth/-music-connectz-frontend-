import test from "node:test";
import assert from "node:assert/strict";
import { scFollowLink, playsLabel, createListenClock, SC_API_SRC } from "./soundcloudPlay.js";

const emb = (o) => ({ type: "soundcloud", ...o });

test("a public permalink becomes the follow link", () => {
  assert.deepEqual(scFollowLink(emb({ permalink: "https://soundcloud.com/artist/track?utm=x#t=1" })),
    { href: "https://soundcloud.com/artist/track", host: "soundcloud.com" });
});
test("older imports with no permalink get nothing, derived from nothing", () => {
  assert.equal(scFollowLink(emb({ sc_id: "1", url: "https://w.soundcloud.com/player/?url=https%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F1" })), null);
});
test("a private track never gets a link, whatever else it carries", () => {
  assert.equal(scFollowLink(emb({ private_on_sc: true, permalink: "https://soundcloud.com/a/b" })), null);
  assert.equal(scFollowLink(emb({ permalink: "https://soundcloud.com/a/b/s-AbCd" + "?secret_token=s-AbCd" })), null);
  assert.equal(scFollowLink(emb({ permalink: "https://soundcloud.com/a/b#secret_token=1" })), null);
});
test("only https soundcloud.com is linked", () => {
  for (const p of ["http://soundcloud.com/a/b", "https://evil.com/soundcloud.com/a", "https://soundcloud.com.evil.com/a",
    "javascript:alert(1)", "https://u:p@soundcloud.com/a/b", "not a url", 5, null])
    assert.equal(scFollowLink(emb({ permalink: p })), null, String(p));
  assert.equal(scFollowLink({ type: "youtube", permalink: "https://soundcloud.com/a/b" }), null);
});
test("the plays label says what it counts, only above 0", () => {
  assert.equal(playsLabel(0), null);
  assert.equal(playsLabel(undefined), null);
  assert.equal(playsLabel(-3), null);
  assert.equal(playsLabel(1), "1 play on Music ConnectZ");
  assert.equal(playsLabel(1234), "1,234 plays on Music ConnectZ");
});
test("the widget script comes from SoundCloud's own origin", () => {
  assert.equal(new URL(SC_API_SRC).origin, "https://w.soundcloud.com");
});
test("the clock counts only while playing and visible", () => {
  const c = createListenClock();
  c.play(0);
  assert.equal(c.take(12_500), 12);       // remainder .5 stays
  c.setVisible(false, 13_000);            // hidden: banks .5 + .5
  assert.equal(c.take(60_000), 1);        // a minute hidden adds nothing
  c.setVisible(true, 70_000);
  c.pause(75_000);                        // 5 s visible playing
  assert.equal(c.take(200_000), 5);       // paused: nothing more
  assert.equal(c.take(300_000), 0);
});
