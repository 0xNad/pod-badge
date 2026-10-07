#!/usr/bin/env node
// badge.mjs: reads one pod's state from a JSON file and prints its SVG badge on stdout.
//
//   node badge.mjs examples/pod.json > badge.svg
//
// Bad input (no argument, a file that cannot be read, invalid JSON, a field that breaks the rules)
// exits 1 with a one-line reason on stderr and nothing on stdout. Node built-ins only.
import { readFileSync } from "node:fs";

// Each state's colour, from cold to orbit, and its light's glow: a CSS animation, "none" for a steady
// glow, false for none at all (a cold pod gives off no heat). The colours are far apart in hue so the
// state reads at a glance, and light enough to carry dark text.
const STATES = {
  cold: { color: "#8CA0B3", glow: false },
  cooking: { color: "#FF7A1A", glow: "breathe 3.2s ease-in-out infinite alternate" },
  pressure: { color: "#E5383B", glow: "breathe .7s ease-in-out infinite alternate" },
  ignition: { color: "#FFC93D", glow: "flicker .12s steps(2) infinite" },
  orbit: { color: "#B69CFF", glow: "none" },
};

const NAME_MAX = 40;
const THEME = { plate: "#0D0908", edge: "#F3EEE9", ink: "#F3EEE9", muted: "#C9C0B9", track: "#3A302B" };

class BadInput extends Error {}

function main(args) {
  try {
    const pod = validate(readPod(parseArgs(args)));
    process.stdout.write(render(pod));
  } catch (e) {
    if (!(e instanceof BadInput)) throw e;
    process.stderr.write(`badge: ${e.message.replace(/\s+/g, " ").trim()}\n`);
    process.exitCode = 1;
  }
}

/** The pod file's path: exactly one argument, no options (none exist yet). */
function parseArgs(args) {
  const options = args.filter((a) => a.startsWith("--"));
  if (options.length) throw new BadInput(`unknown option ${options[0]} (usage: node badge.mjs <pod.json>)`);
  if (args.length === 0) throw new BadInput("no pod file given (usage: node badge.mjs <pod.json>)");
  if (args.length > 1) throw new BadInput(`expected one pod file, got ${args.length} arguments (usage: node badge.mjs <pod.json>)`);
  return args[0];
}

const READ_ERRORS = { ENOENT: "no such file", EISDIR: "it is a directory", EACCES: "permission denied" };

/** The file's JSON value; a leading byte-order mark is allowed. */
function readPod(file) {
  let src;
  try {
    src = readFileSync(file, "utf8");
  } catch (e) {
    throw new BadInput(`cannot read ${file}: ${READ_ERRORS[e.code] ?? e.message}`);
  }
  try {
    return JSON.parse(src.replace(/^\uFEFF/, ""));
  } catch (e) {
    throw new BadInput(`${file} is not valid JSON: ${e.message}`);
  }
}

const show = (v) => (v === undefined ? "nothing" : JSON.stringify(v).slice(0, 60));
// Characters no XML document can hold (controls, lone surrogates, U+FFFE/FFFF), and the other
// controls (tab, newline, DEL, C1): a badge shows its name on one line, exactly as given.
const UNSHOWABLE = /[\p{Cc}\p{Cs}\uFFFE\uFFFF]/u;

/** The pod, checked field by field: throws a BadInput naming the first field that breaks the rules. */
function validate(pod) {
  if (typeof pod !== "object" || pod === null || Array.isArray(pod)) throw new BadInput(`the pod must be a JSON object, got ${show(pod)}`);
  const { name, state, round, rounds } = pod;

  if (typeof name !== "string") throw new BadInput(`name must be a string, got ${show(name)}`);
  const length = [...name].length;
  if (length < 1 || length > NAME_MAX) throw new BadInput(`name must have 1 to ${NAME_MAX} characters, got ${length}`);
  const bad = UNSHOWABLE.exec(name);
  if (bad) throw new BadInput(`name holds U+${bad[0].codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}, a control or invalid character a badge cannot show`);

  if (!Object.hasOwn(STATES, state)) throw new BadInput(`state must be one of ${Object.keys(STATES).join(", ")}, got ${show(state)}`);

  for (const [field, value] of [["round", round], ["rounds", rounds]]) {
    if (!Number.isSafeInteger(value)) throw new BadInput(`${field} must be a whole number, got ${show(value)}`);
    if (value < 1) throw new BadInput(`${field} must be at least 1, got ${value}`);
  }
  if (round > rounds) throw new BadInput(`round ${round} is past the last round (rounds is ${rounds})`);
  return { name, state, round, rounds };
}

// Layout. All text is monospace, so its width is known without measuring: ADVANCE em per cell,
// two cells for wide characters (CJK, emoji), none for combining marks and joiners.
const H = 32;
const PAD = 10;
const ADVANCE = 0.6;
const NAME_PX = 13;
const LABEL_PX = 11;
const LABEL_SPACING = 1;
const BASELINE = 20.5;
const WIDE = /[\u1100-\u115F\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFF60\uFFE0-\uFFE6\u{20000}-\u{3FFFD}]|\p{Emoji_Presentation}/u;
const ZERO = /[\p{Mn}\p{Me}\u200B-\u200D\uFE00-\uFE0F]/u;

const cells = (s) => [...s].reduce((n, ch) => n + (ZERO.test(ch) ? 0 : WIDE.test(ch) ? 2 : 1), 0);
const nameWidth = (s) => cells(s) * ADVANCE * NAME_PX;
const labelWidth = (s) => cells(s) * (ADVANCE * LABEL_PX + LABEL_SPACING);
const px = (n) => +n.toFixed(1);
const escape = (s) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** The badge: a dark plate with the state's light and the name, the state's chip, the round and its progress. */
function render({ name, state, round, rounds }) {
  const { color, glow } = STATES[state];
  const label = state.toUpperCase();
  const progress = `ROUND ${round}/${rounds}`;

  // Left to right: the light, the name, the chip, the round.
  const light = PAD + 4;
  const nameX = light + 12;
  const chipX = nameX + nameWidth(name) + PAD;
  const chipW = labelWidth(label) + 16;
  const roundX = chipX + chipW + PAD;
  const roundW = labelWidth(progress);
  const width = Math.ceil(roundX + roundW + PAD);
  const summary = `${name}: ${label}, round ${round} of ${rounds}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${H}" viewBox="0 0 ${width} ${H}" role="img" aria-label="${escape(summary)}">
  <title>${escape(summary)}</title>
  <style>
    text { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "DejaVu Sans Mono", "Liberation Mono", monospace; }
    .name { font-size: ${NAME_PX}px; font-weight: 600; white-space: pre; }
    .label { font-size: ${LABEL_PX}px; font-weight: 700; letter-spacing: ${LABEL_SPACING}px; }
    .glow { animation: ${glow || "none"}; }
    @keyframes breathe { from { opacity: .12 } to { opacity: .5 } }
    @keyframes flicker { 50% { opacity: .15 } }
    @media (prefers-reduced-motion: reduce) { .glow { animation: none; } }
  </style>
  <rect width="${width}" height="${H}" rx="3" fill="${THEME.plate}"/>
  <rect x=".5" y=".5" width="${width - 1}" height="${H - 1}" rx="2.5" fill="none" stroke="${THEME.edge}" stroke-opacity=".14"/>
${glow ? `  <circle class="glow" cx="${light}" cy="${H / 2}" r="8.5" fill="${color}" opacity=".35"/>\n` : ""}  <circle cx="${light}" cy="${H / 2}" r="4" fill="${color}"/>
  <text class="name" x="${px(nameX + nameWidth(name) / 2)}" y="${BASELINE}" text-anchor="middle" fill="${THEME.ink}" xml:space="preserve">${escape(name)}</text>
  <rect x="${px(chipX)}" y="6" width="${px(chipW)}" height="${H - 12}" rx="2" fill="${color}"/>
  <text class="label" x="${px(chipX + chipW / 2 + LABEL_SPACING / 2)}" y="${BASELINE}" text-anchor="middle" fill="${THEME.plate}">${label}</text>
  <text class="label" x="${px(roundX + roundW / 2 + LABEL_SPACING / 2)}" y="${BASELINE}" text-anchor="middle" fill="${THEME.muted}">${progress}</text>
  <rect x="${px(roundX)}" y="24" width="${px(roundW)}" height="2" rx="1" fill="${THEME.track}"/>
  <rect x="${px(roundX)}" y="24" width="${px((roundW * round) / rounds)}" height="2" rx="1" fill="${color}"/>
</svg>
`;
}

main(process.argv.slice(2));
