#!/usr/bin/env node
// Pod Badge: reads a pod's state from a JSON file and prints an SVG badge for it.
//   node badge.mjs <pod.json> > badge.svg
import { readFileSync } from "node:fs";

/** Each state's colour: cold is dark metal, the rest heat up toward launch. */
export const STATES = {
  cold: "#8A807A",
  cooking: "#F05A18",
  pressure: "#FF7A1A",
  ignition: "#FFB35C",
  orbit: "#FFD9A0",
};

const WIDTH = 440;
const HEIGHT = 132;

/** Stops with a one-line reason on stderr and nothing on stdout. */
function fail(reason) {
  process.stderr.write(`badge: ${reason}\n`);
  process.exit(1);
}

/** Reads and validates the pod, or fails with the first rule it breaks. */
export function readPod(path) {
  if (!path) fail("usage: node badge.mjs <pod.json>");
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch (e) {
    fail(`cannot read ${path}: ${e.code ?? e.message}`);
  }
  let pod;
  try {
    pod = JSON.parse(text);
  } catch {
    fail(`${path} is not valid JSON`);
  }
  if (pod === null || typeof pod !== "object" || Array.isArray(pod)) fail("the pod must be a JSON object");
  const { name, state, round, rounds } = pod;
  if (typeof name !== "string" || name.length < 1 || name.length > 40) fail("name must be text of 1 to 40 characters");
  if (!Object.hasOwn(STATES, state)) fail(`state must be one of ${Object.keys(STATES).join(", ")}`);
  if (!Number.isInteger(round) || !Number.isInteger(rounds)) fail("round and rounds must be whole numbers");
  if (round < 1 || round > rounds) fail(`round must be between 1 and rounds (${rounds})`);
  return { name, state, round, rounds };
}

/** Escapes text for XML content and attributes. */
export const escape = (s) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]);

/** One segment per round, the ones reached lit in the state's colour. */
function progress({ round, rounds }, color) {
  const x0 = 24, width = WIDTH - 48, gap = rounds > 24 ? 1 : 4;
  const seg = (width - gap * (rounds - 1)) / rounds;
  return Array.from({ length: rounds }, (_, i) => {
    const fill = i < round ? color : "#2A2320";
    return `<rect x="${(x0 + i * (seg + gap)).toFixed(2)}" y="104" width="${seg.toFixed(2)}" height="6" rx="2" fill="${fill}"/>`;
  }).join("");
}

/** The badge as an SVG document. */
export function render(pod) {
  const color = STATES[pod.state];
  const mono = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${escape(`${pod.name}: ${pod.state}, round ${pod.round} of ${pod.rounds}`)}">
  <defs>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${color}" stop-opacity=".55"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" rx="10" fill="#0D0908"/>
  <rect x=".5" y=".5" width="${WIDTH - 1}" height="${HEIGHT - 1}" rx="9.5" fill="none" stroke="#2A2320"/>
  <circle cx="36" cy="40" r="16" fill="url(#glow)"/>
  <circle cx="36" cy="40" r="6" fill="${color}"/>
  <text x="56" y="47" fill="#F3EEE9" font-family="${mono}" font-size="20" font-weight="700">${escape(pod.name)}</text>
  <text x="24" y="86" fill="${color}" font-family="${mono}" font-size="15" font-weight="700" letter-spacing="2">${pod.state.toUpperCase()}</text>
  <text x="${WIDTH - 24}" y="86" fill="#8A807A" font-family="${mono}" font-size="13" letter-spacing="1.5" text-anchor="end">ROUND ${pod.round}/${pod.rounds}</text>
  ${progress(pod, color)}
</svg>
`;
}

process.stdout.write(render(readPod(process.argv[2])));
