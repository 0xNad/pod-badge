// Edge cases of badge.mjs beyond the round's checks. Run: node --test
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const BADGE = fileURLToPath(new URL("../badge.mjs", import.meta.url));

const dir = mkdtempSync(join(tmpdir(), "badge-"));
const POD = { name: "agent-card", state: "cooking", round: 2, rounds: 3 };
let n = 0;

/** Runs badge.mjs on a file holding `content` (an object as JSON, a string as is). */
function run(content, args = []) {
  const file = join(dir, `pod-${++n}.json`);
  writeFileSync(file, typeof content === "string" ? content : JSON.stringify(content));
  return spawnSync(process.execPath, [BADGE, ...args, file], { encoding: "utf8" });
}

function refused(r, reason) {
  assert.notEqual(r.status, 0);
  assert.equal(r.stdout, "");
  assert.match(r.stderr, reason);
  assert.equal(r.stderr.trimEnd().split("\n").length, 1, "the reason fits on one line");
}

test("a valid pod prints one SVG document", () => {
  const r = run(POD);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" width="\d+" height="32"/);
  assert.match(r.stdout, />COOKING<\/text>/);
  assert.match(r.stdout, />ROUND 2\/3<\/text>/);
});

test("a byte-order mark before the JSON is allowed", () => {
  assert.equal(run(`\uFEFF${JSON.stringify(POD)}`).status, 0);
});

test("a 40-character name is allowed, counted in characters, not UTF-16 units", () => {
  assert.equal(run({ ...POD, name: "🚀".repeat(40) }).status, 0);
  refused(run({ ...POD, name: "🚀".repeat(41) }), /1 to 40 characters, got 41/);
});

test("the badge grows with the name, wide characters counting double", () => {
  const width = (name) => Number(/width="(\d+)"/.exec(run({ ...POD, name }).stdout)[1]);
  assert.ok(width("abcd") > width("ab"));
  assert.ok(width("ポッド") > width("abc"));
});

test("refuses a pod that is not an object", () => {
  refused(run("[1, 2]"), /must be a JSON object/);
  refused(run("null"), /must be a JSON object/);
});

test("refuses each field that breaks the rules", () => {
  refused(run({ ...POD, name: undefined }), /name must be a string, got nothing/);
  refused(run({ ...POD, name: "line\nbreak" }), /U\+000A/);
  refused(run({ ...POD, state: "COOKING" }), /state must be one of cold, cooking, pressure, ignition, orbit/);
  refused(run({ ...POD, round: "2" }), /round must be a whole number, got "2"/);
  refused(run({ ...POD, rounds: 1e300 }), /rounds must be a whole number/);
  refused(run({ ...POD, round: -1 }), /round must be at least 1/);
  refused(run({ ...POD, round: 4 }), /round 4 is past the last round/);
});

test("refuses an unknown option and extra arguments", () => {
  refused(run(POD, ["--loud"]), /unknown option --loud/);
  refused(run(POD, ["other.json"]), /expected one pod file, got 2 arguments/);
});

test("refuses a file it cannot read", () => {
  const r = spawnSync(process.execPath, [BADGE, dir], { encoding: "utf8" });
  refused(r, /cannot read .*: it is a directory/);
});
