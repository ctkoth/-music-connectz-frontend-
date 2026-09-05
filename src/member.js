// Open a member's profile card from anywhere.
//
// `MemberProfile` is mounted once, at the top of App, behind a `memberKey`
// piece of state — which meant only the two things holding that setter could
// open anybody. Every other screen that names a member (the directory, a LogZ
// row, a post's author) had a username on screen and no way to act on it.
export function openMember(username) {
  if (!username) return;
  window.dispatchEvent(new CustomEvent("mcz-open-member", { detail: String(username) }));
}
