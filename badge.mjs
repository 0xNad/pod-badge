#!/usr/bin/env node
// Pod Badge: reads one pod's state from a JSON file and prints its SVG badge on stdout.
// Usage: node badge.mjs <pod.json>. Bad input exits 1 with a one-line reason on stderr.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/** Each state's colour: cold to hot, then orbit. Add a state here and the badge supports it. */
export const STATES = {
  cold: "#60a5fa",
  cooking: "#fbbf24",
  pressure: "#fb923c",
  ignition: "#f43f5e",
  orbit: "#a78bfa",
};

const MAX_NAME = 40;
// Characters an XML document may not contain, even escaped.
const NOT_XML = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

class BadInput extends Error {}

/** Checks a parsed pod against the rules and returns it, or throws BadInput with the reason. */
export function validate(pod) {
  if (pod === null || typeof pod !== "object" || Array.isArray(pod)) throw new BadInput("the pod must be a JSON object");
  const { name, state, round, rounds } = pod;
  if (typeof name !== "string") throw new BadInput("name is required and must be a string");
  const length = [...name].length;
  if (length < 1 || length > MAX_NAME) throw new BadInput(`name must be 1 to ${MAX_NAME} characters, got ${length}`);
  if (NOT_XML.test(name)) throw new BadInput("name contains a control character an SVG cannot hold");
  if (!Object.hasOwn(STATES, state)) throw new BadInput(`state must be one of ${Object.keys(STATES).join(", ")}, got ${JSON.stringify(state)}`);
  if (!Number.isInteger(rounds) || rounds < 1) throw new BadInput(`rounds must be a whole number of at least 1, got ${JSON.stringify(rounds)}`);
  if (!Number.isInteger(round) || round < 1 || round > rounds) throw new BadInput(`round must be a whole number from 1 to rounds (${rounds}), got ${JSON.stringify(round)}`);
  return { name, state, round, rounds };
}

const escape = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]);

// A width estimate for bold sans-serif text (in units of the font size), generous on wide glyphs so a
// name never runs into the state pill.
const glyph = (c) => (/[\u1100-\uFFFF]/.test(c) ? 1.05 : /[MWmw@%]/.test(c) ? 0.95 : /[A-Z0-9#&]/.test(c) ? 0.72 : /[ijlI.,:;'|!]/.test(c) ? 0.3 : 0.6);
const textWidth = (s, size) => [...s].reduce((w, c) => w + glyph(c), 0) * size;

/** The badge's SVG for a valid pod. */
export function render({ name, state, round, rounds }) {
  const colour = STATES[state];
  const label = state.toUpperCase();
  const progress = `ROUND ${round}/${rounds}`;
  const H = 40, PAD = 14, DOT = 10;

  const nameW = Math.ceil(textWidth(name, 14));
  const stateW = Math.ceil(textWidth(label, 11) + 1.5 * label.length) + 2 * 10;
  const progW = Math.ceil(textWidth(progress, 11) + 1 * progress.length);

  const xName = PAD + DOT + 8;
  const xState = xName + nameW + 12;
  const xProg = xState + stateW + 14;
  const W = xProg + progW + PAD;
  const mid = H / 2;
  const font = `font-family="'Segoe UI',Helvetica,Arial,sans-serif"`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escape(`${name}: ${label}, ${progress}`)}">
  <title>${escape(`${name}: ${label}, ${progress}`)}</title>
  <clipPath id="card"><rect width="${W}" height="${H}" rx="8"/></clipPath>
  <g clip-path="url(#card)">
    <rect width="${W}" height="${H}" fill="#0d1117"/>
    <rect width="4" height="${H}" fill="${colour}"/>
  </g>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="7.5" fill="none" stroke="#30363d"/>
  <circle cx="${PAD + DOT / 2}" cy="${mid}" r="${DOT / 2 + 3}" fill="${colour}" opacity="0.25"/>
  <circle cx="${PAD + DOT / 2}" cy="${mid}" r="${DOT / 2}" fill="${colour}"/>
  <text x="${xName}" y="${mid}" dominant-baseline="central" ${font} font-size="14" font-weight="600" fill="#e6edf3">${escape(name)}</text>
  <rect x="${xState}" y="${mid - 11}" width="${stateW}" height="22" rx="11" fill="${colour}"/>
  <text x="${xState + stateW / 2}" y="${mid}" dominant-baseline="central" text-anchor="middle" ${font} font-size="11" font-weight="700" letter-spacing="1.5" fill="#0d1117">${label}</text>
  <text x="${xProg}" y="${mid}" dominant-baseline="central" ${font} font-size="11" font-weight="600" letter-spacing="1" fill="#8b949e">${progress}</text>
</svg>
`;
}

function main([file]) {
  if (!file) throw new BadInput("usage: node badge.mjs <pod.json>");
  let src;
  try {
    src = readFileSync(file, "utf8");
  } catch (e) {
    throw new BadInput(`cannot read ${file}: ${e.code ?? e.message}`);
  }
  let pod;
  try {
    pod = JSON.parse(src);
  } catch (e) {
    throw new BadInput(`${file} is not valid JSON: ${e.message.split("\n")[0]}`);
  }
  process.stdout.write(render(validate(pod)));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main(process.argv.slice(2));
  } catch (e) {
    if (!(e instanceof BadInput)) throw e;
    process.stderr.write(`badge: ${e.message}\n`);
    process.exitCode = 1;
  }
}
