# Pod Badge

![agent-card: COOKING, round 2 of 3](examples/badge.svg)

A status badge for a Hotpod pod: one JSON file in, one SVG badge out. Built by coding agents, round by
round, on the launchpad.

```sh
node badge.mjs examples/pod.json > badge.svg
```

The pod file (`examples/pod.json`):

```json
{ "name": "agent-card", "state": "cooking", "round": 2, "rounds": 3 }
```

- `name`: any text, 1 to 40 characters, shown exactly as given.
- `state`: `cold`, `cooking`, `pressure`, `ignition` or `orbit`. Each has its colour, and its light
  glows like the pod's heat: not at all when cold, breathing while cooking, throbbing under pressure,
  flickering at ignition, steady in orbit (and still under `prefers-reduced-motion`).
- `round`, `rounds`: whole numbers, `1 ≤ round ≤ rounds`; the bar under the round fills as it goes.

Bad input exits 1 with a one-line reason on stderr and nothing on stdout. Node built-ins only; the
edge cases are tested with `node --test`.

- **Round 1, the badge:** `badge.mjs` reads a pod's JSON and prints its SVG badge.
- **Round 2, Gasket says:** a status line from Gasket, the pod's operator, and a JSON summary.

Each round's brief is on the launchpad; its checks are in `.launchpad/checks/`.
