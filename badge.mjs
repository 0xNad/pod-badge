#!/usr/bin/env node
// Pod Badge: a pod's state as a compact two-part badge, in the style of a README shield.
//   node badge.mjs <pod.json> > badge.svg
import { readFileSync } from "node:fs";

// The right half takes the state's colour; text on it stays dark for contrast.
const COLORS = { cold: "#5E5652", cooking: "#F05A18", pressure: "#FF7A1A", ignition: "#FFB35C", orbit: "#FFE2B8" };
const INK = { cold: "#F3EEE9", cooking: "#140D0B", pressure: "#140D0B", ignition: "#140D0B", orbit: "#140D0B" };

const SIZE = 13;          // font size
const CHAR = SIZE * 0.62; // width of one monospace character
const BOLD = SIZE * 0.74; // the same, bold
const PAD = 12;
const HEIGHT = 30;

const die = (why) => {
  process.stderr.write(`badge: ${why}\n`);
  process.exit(1);
};

function load(path) {
  if (!path) die("missing argument: node badge.mjs <pod.json>");
  let raw, pod;
  try { raw = readFileSync(path, "utf8"); } catch { die(`cannot read file ${path}`); }
  try { pod = JSON.parse(raw); } catch { die("invalid JSON"); }
  if (!pod || typeof pod !== "object" || Array.isArray(pod)) die("expected a JSON object");
  const { name, state, round, rounds } = pod;
  if (typeof name !== "string" || [...name].length < 1 || [...name].length > 40) die("name: 1 to 40 characters");
  if (!(state in COLORS) || !Object.hasOwn(COLORS, state)) die(`state: one of ${Object.keys(COLORS).join(", ")}`);
  if (!Number.isInteger(round) || !Number.isInteger(rounds) || round < 1 || round > rounds) die("round, rounds: whole numbers with 1 <= round <= rounds");
  return { name, state, round, rounds };
}

const xml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function badge({ name, state, round, rounds }) {
  const right = `${state.toUpperCase()} · ROUND ${round}/${rounds}`;
  const lw = Math.ceil([...name].length * CHAR + PAD * 2 + 14); // room for the pilot light
  const rw = Math.ceil(right.length * BOLD + PAD * 2);
  const w = lw + rw;
  const font = `font-family="ui-monospace, Menlo, Consolas, monospace" font-size="${SIZE}"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${HEIGHT}" viewBox="0 0 ${w} ${HEIGHT}">
  <title>${xml(`${name}: ${state}, round ${round} of ${rounds}`)}</title>
  <clipPath id="r"><rect width="${w}" height="${HEIGHT}" rx="6"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${lw}" height="${HEIGHT}" fill="#140D0B"/>
    <rect x="${lw}" width="${rw}" height="${HEIGHT}" fill="${COLORS[state]}"/>
  </g>
  <circle cx="${PAD + 3}" cy="${HEIGHT / 2}" r="3.5" fill="${COLORS[state]}"/>
  <text x="${PAD + 14}" y="${HEIGHT / 2 + 4.5}" fill="#F3EEE9" ${font}>${xml(name)}</text>
  <text x="${lw + PAD}" y="${HEIGHT / 2 + 4.5}" fill="${INK[state]}" ${font} font-weight="700">${right}</text>
</svg>
`;
}

process.stdout.write(badge(load(process.argv[2])));
