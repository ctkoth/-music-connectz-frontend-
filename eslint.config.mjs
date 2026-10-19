// One rule, on purpose: `no-undef`.
//
// This repo has shipped a call to a name that does not exist THREE times, and
// every one of them was a dead button on a screen that looked completely fine:
//
//   * BossTake called `track(...)` and imported it nowhere, so Record threw
//     before the mic prompt and Send was a spinner that never ended — for four
//     days, on the one screen a stranger ever sees.
//   * BattleZ called `uploadWork()`, `hasBlobs()` and `primaryMedia()` and
//     imported none of them.
//   * GameProfilePanel called `talk(...)` in both Save handlers and bound it
//     nowhere, so saving a RapZ or SingZ game profile threw.
//
// Nothing could catch them. Vite builds with esbuild, which does not resolve
// free identifiers — an undefined global is a runtime error by design, so the
// bundle is valid and the button is not. `npm run build` was green every time.
//
// `src/imports.test.mjs` catches the first shape (a name a HELPER exports).
// It cannot catch the third, because `talk` is exported by nothing at all —
// and that is the worse case, since a name no module exports can never resolve
// from anywhere. A hand-rolled regex version of this was tried and produced
// twenty false positives on destructured props, class methods and CSS strings.
// This is the tool that does it with real scope analysis.
//
// ONE RULE, and that is deliberate. A config that also has opinions about
// quotes and hooks-deps would flood this codebase with thousands of warnings
// on day one, and a check nobody can get to zero is a check nobody runs.
// Every rule added here has to earn its place the way this one did: by being
// a bug that actually shipped.
import globals from "globals";
// Registered ONLY so the `// eslint-disable-next-line react-hooks/...`
// comments already scattered through the app resolve to a real rule. Its
// rules stay off: turning exhaustive-deps on would add hundreds of findings
// to a codebase that has been written without it, and a check nobody can get
// to zero is a check nobody runs.
import reactHooks from "eslint-plugin-react-hooks";

export default [
  {
    files: ["**/*.{js,jsx,mjs}"],
    // `src/mcz2/` is the 2.2 reference app and is not mounted — see CLAUDE.md.
    ignores: ["dist/**", "node_modules/**", "src/mcz2/**", "android/**"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node, ...globals.es2021 },
    },
    plugins: { "react-hooks": reactHooks },
    // Off, because every one of the app's existing
    // `eslint-disable-next-line react-hooks/exhaustive-deps` comments reads as
    // "unused" while that rule is off — fourteen warnings that mean nothing.
    linterOptions: { reportUnusedDisableDirectives: "off" },
    rules: {
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/rules-of-hooks": "off",
      "no-undef": "error",
      // A JSX component reference is a use of the identifier; without this,
      // every imported component reads as unused and an unimported one reads
      // as fine, which is the wrong way round.
      "no-unused-vars": "off",
    },
  },
];
