// Response-shape guards.
//
// Every crash in the frontend audit was the same move: take what an endpoint
// returned and immediately index into it. `data.labels.map(...)`,
// `drills` from a Promise.all, `p.top_styles.length`. A 200 that omits a key,
// or returns an object where a list was assumed, then takes a whole tab into
// the error boundary — and we shipped three of those for real.
//
// A missing key is not exceptional. It is what a partially-built endpoint, a
// changed serializer, or an older server returns. Coerce at the boundary.
export const asList = (v) => (Array.isArray(v) ? v : []);
export const asDict = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});
