// Shared helpers for Pod Badge's checks: run the entry, parse its SVG, read its visible text.
import { entry, input, refuses, succeeds } from "./entry.mjs";
import { parseXml, textOf, walk, localName } from "./xml.mjs";
export { check, harness } from "./harness.mjs";
export { input, refuses, succeeds };

export const STATES = ["cold", "cooking", "pressure", "ignition", "orbit"];
export const badge = entry("node", ["badge.mjs"]);

/** Runs badge.mjs on a pod (an object, written to a file) and returns the parsed SVG root and its text. */
export async function render(pod, flags = []) {
  const r = await succeeds(badge, [...flags, input(pod)], "a valid pod");
  let root;
  try { root = parseXml(r.out); } catch (e) { throw new Error(`stdout is not well-formed XML: ${e.message}`); }
  return { r, root, text: visibleText(root) };
}

/** The text a reader sees: every <text>/<tspan> run, spaces collapsed. */
export function visibleText(root) {
  const runs = [];
  for (const el of walk(root)) if (localName(el.name) === "text") runs.push(textOf(el));
  return runs.join(" ").replace(/\s+/g, " ").trim();
}
