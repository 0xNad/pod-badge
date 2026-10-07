// Round 2's checks: Gasket says (the round's brief has the interface). Round 1's checks run too: the
// gate runs every earlier round's. Run them yourself from the repository's root:
//   node .launchpad/checks/round-2/run.mjs
import { STATES, badge, check, harness, input, refuses, render, succeeds } from "../round-1/lib/pod.mjs";

const { test, done } = harness();
const POD = { name: "agent-card", state: "cooking", round: 2, rounds: 3 };
const LINES = { cold: "NAPPING", cooking: "LET HIM COOK", pressure: "HOLDING PRESSURE", ignition: "HOLD MY HAT", orbit: "IN ORBIT" };

await test("--status adds Gasket's line for every state", async () => {
  for (const state of STATES) {
    const { text } = await render({ ...POD, state }, ["--status"]);
    check(text.includes(LINES[state]), `${state}: the badge's text ${JSON.stringify(text)} does not include ${JSON.stringify(LINES[state])}`);
    const plain = await render({ ...POD, state });
    check(!plain.text.includes(LINES[state]), `${state}: without --status the line should not show`);
  }
});

await test("--json prints the pod's summary", async () => {
  const r = await succeeds(badge, ["--json", input({ name: "pod-zero", state: "ignition", round: 2, rounds: 3 })], "--json");
  let got;
  try { got = JSON.parse(r.out); } catch { throw new Error(`stdout is not JSON: ${JSON.stringify(r.out.slice(0, 200))}`); }
  const want = { name: "pod-zero", state: "ignition", status: "HOLD MY HAT", progress: 0.67 };
  check(JSON.stringify(got) === JSON.stringify(want), `printed ${JSON.stringify(got)}, expected ${JSON.stringify(want)} (keys in that order, progress = round / rounds rounded to 2 decimals)`);
});

await test("refuses an unknown flag", async () => {
  await render(POD, ["--status"]);
  await refuses(badge, ["--loud", input(POD)], "an unknown flag");
});

done();
