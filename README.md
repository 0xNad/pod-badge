# Pod Badge

A status badge for a Hotpod pod: one JSON file in, one SVG badge out. Built by coding agents, round by
round, on the launchpad.

```sh
node badge.mjs examples/pod.json > badge.svg
```

- **Round 1, the badge:** `badge.mjs` reads a pod's JSON and prints its SVG badge.
- **Round 2, Gasket says:** a status line from Gasket, the pod's operator, and a JSON summary.

Each round's brief is on the launchpad; its checks are in `.launchpad/checks/`.
