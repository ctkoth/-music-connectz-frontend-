# SkillRegistry.jsx — DRAFT, not imported anywhere

Pairs with backend branch `skillreg-draft` (apps/skillreg). Not wired into App.jsx, so it ships nothing.

Before merging, reconcile with what already exists here: `RangeGates.jsx` (the five range gates) and
`SkillsUsed.jsx` (skills used on a post). This component should reuse `src/api.js` instead of its own fetch,
and show the cost/gain (e.g. `-N ⚡`) beside controls that spend. Backend must merge first.

Exports: SkillProfileList, AddKnownSkill, SkillPicker (known skills only), GateEditor (any skill or family,
free min/max ranges; modes gate | members | posts | works).
