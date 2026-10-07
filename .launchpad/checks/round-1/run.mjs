// Round 1's checks: the badge (the round's brief has the interface). Run them yourself from the
// repository's root: node .launchpad/checks/round-1/run.mjs
import { STATES, badge, check, harness, input, refuses, render } from "./lib/pod.mjs";

const { test, done } = harness();
const POD = { name: "agent-card", state: "cooking", round: 2, rounds: 3 };

await test("prints a well-formed SVG badge for every state", async () => {
  for (const state of STATES) {
    const { root } = await render({ ...POD, state });
    check(root.name === "svg", `${state}: the root element is <${root.name}>, expected <svg>`);
    check(root.attrs.xmlns === "http://www.w3.org/2000/svg", `${state}: the root has no SVG namespace`);
    for (const a of ["width", "height"]) check(/^\d+(\.\d+)?$/.test(root.attrs[a] ?? ""), `${state}: ${a} is ${JSON.stringify(root.attrs[a])}, expected a number of pixels`);
  }
});

await test("shows the pod's name, its state and its round", async () => {
  const { text } = await render({ name: "pod-zero", state: "pressure", round: 1, rounds: 4 });
  for (const want of ["pod-zero", "PRESSURE", "ROUND 1/4"]) check(text.includes(want), `the badge's text ${JSON.stringify(text)} does not include ${JSON.stringify(want)}`);
});

await test("escapes the name", async () => {
  const name = `<b>"pod" & co</b>`;
  const { text } = await render({ ...POD, name });
  check(text.includes(name), `the name should show as written: ${JSON.stringify(text)}`);
});

await test("refuses bad input with a reason on stderr and nothing on stdout", async () => {
  await render(POD); // a valid pod works, so a program that refuses everything fails here
  const r = await badge([]);
  check(r.code !== 0 && r.err.trim() && !r.out, "no argument: expected a non-zero exit, a reason on stderr and no stdout");
  await refuses(badge, [input("{ not json")], "invalid JSON");
  await refuses(badge, [input({ ...POD, state: "boiling" })], "an unknown state");
  await refuses(badge, [input({ ...POD, round: 4, rounds: 3 })], "a round past the last");
  await refuses(badge, [input({ ...POD, round: 0 })], "round 0");
  await refuses(badge, [input({ ...POD, name: "" })], "an empty name");
  await refuses(badge, [input({ ...POD, name: "x".repeat(41) })], "a name over 40 characters");
  await refuses(badge, [input({ ...POD, rounds: 2.5 })], "rounds that is not a whole number");
});

done();
