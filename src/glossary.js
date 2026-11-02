// One list of the words this app uses that a newcomer will not know, each with a plain
// definition. Screens render a word through <Term k="…"> (components/Term.jsx) and the
// homepage prints the whole list, so a definition is written once and cannot drift between
// the two. No tier number lives here (they come from the server) and nothing here decides
// anything — it only explains words.
//
// Order matters: the homepage lists them in this order, escrow first.
export const GLOSSARY = [
  { key: "escrow", word: "Escrow", forms: ["escrowed", "escrow"],
    means: "Money held by Music ConnectZ while a job is done, so neither side has to trust the other first. " +
           "The payer puts the money in before work starts, the worker can see it is there, and it is paid out " +
           "when the work is delivered and released — or released automatically after a set number of days if " +
           "nobody disputes it. That is why a stranger can safely take a first deal." },
  { key: "median", word: "Median", forms: ["median"],
    means: "The middle rating when every rating is lined up from lowest to highest. One friend giving a 10, " +
           "or one critic giving a 1, cannot move it much — which is why ratings here use the middle, not the average." },
  { key: "royalty", word: "Royalty", forms: ["royalty", "royalties"],
    means: "A share of what a track earns each time it is played, paid to the people credited on it." },
  { key: "partnerz", word: "PartnerZ", forms: ["partnerz"],
    means: "Two members who have finished real work together before (a paid collab, or a battle a third person judged). " +
           "Their next deal's escrow releases sooner, because they have already proved they deal fairly." },
  { key: "spinaz", word: "SpinaZ", forms: ["spinaz"],
    means: "The in-app coin you earn by rating, referring and similar. It is spent on things inside the app and is not cash." },
  { key: "promptz", word: "PromptZ", forms: ["promptz"],
    means: "Prepaid credits for the AI. Everyone also gets a free daily allowance of AI runs; PromptZ covers what goes past it." },
  { key: "energy", word: "Energy", forms: ["energy"],
    means: "A meter that refills every hour and is spent on actions like starting a deal. It stops one account doing everything at once." },
  { key: "ai_coach", word: "AI coach", forms: ["ai coach", "coach"],
    means: "The AI that listens to your take (or reads your logged workout) and scores or advises on it. " +
           "Everywhere in this app, “coach” means the AI coach; a person you message is called a person." },
  { key: "planner", word: "Planner", forms: ["planner"],
    means: "BodieZ's routine builder and progress reader. It is plain arithmetic on your logged sets — no AI. " +
           "Send a finished workout to the AI coach if you want it read and spoken to you." },
  { key: "statz", word: "StatZ", forms: ["statz"],
    means: "The top membership tier: who viewed your posts, by name, plus the other perks listed in MembershipZ." },
  { key: "dispute", word: "Dispute", forms: ["dispute", "disputed"],
    means: "Telling the platform the delivered work is not what was agreed, so the held money is not released until it is sorted out." },
];

export const byKey = (k) => GLOSSARY.find((g) => g.key === k) || null;
