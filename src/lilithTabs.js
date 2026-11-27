// What each Lilith tab IS, in Corey's words — shown in the modal the tab's icon opens. The tab's name and emoji
// are the server's (`bucket_labels`); this is only the description. Each sentence says what the code really does:
// Lilith has no calendar link, so Upcoming does not claim one — its dates are the ones on the tasks themselves.
export const LILITH_TAB_INFO = {
  inbox: "📥 The Inbox is where new tasks land before you organize them — into Today, Upcoming, Anytime, Someday, or a routine.",
  today: "‼️ Today is for tasks you plan to work on now. It has no dates, because today is the date. What you finish here pays, and the coin left for today is stated above the board.",
  upcoming: "❗ Upcoming is for tasks with a day. Soonest first; an overdue one says so, and a task with no day says that too. Pick a day from the calendar on any task outside Today.",
  anytime: "👐🏼 Anytime is for tasks you can do whenever, without committing them to a day. A day can still be picked from the calendar if one turns up.",
  someday: "❓ Someday is for tasks and ideas you may want to do later but do not want active in your workflow right now.",
  logbook: "🧾 Finished tasks move to the Logbook, so you can look back at what you got done.",
  trash: "🚮 Deleted tasks go to the Trash first and can be restored. Emptying it removes them for good, and anything left is cleared after 30 days.",
};
