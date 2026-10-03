# Custom colours replace a theme's wedges, and nothing else

Themes were originally the only source of colour: hand-designed, chosen by name, never assembled from individual values. Teams wanted their own colours on the wheel, so a Board can now carry a `colors` list. It replaces the theme's wedge colours only. The background, rim, accent and text still come from the named theme, because those are tuned against each other and against the UI that sits on them, and a free choice there is how the Setup panel ends up unreadable.

The list is not a seventh theme and there is no `theme=custom`: `theme` and `colors` are independent keys, so a Board written by hand can put its own wedges on any backdrop, and a Board whose `colors` are malformed degrades to its theme rather than to the default one. In Setup, picking a theme discards the custom colours (with an undo), because someone clicking a theme wants the wheel they were shown.

Two guarantees from ADR 0009 are hand-made for the built-in palettes and cannot be for these:

- **Neighbour distance is the team's problem.** Nothing stops two near-identical colours being placed side by side. Fewer than two valid colours is refused, since wedges could not be told apart at all.
- **Label contrast is best-effort.** `inkFor` still picks the better of dark and light ink per wedge, which bottoms out at about 4.25:1 on the worst possible mid-tone — a little under the 4.5:1 the built-in palettes are held to. The alternative, rejecting or adjusting a colour someone chose, was judged worse.

Colours travel as bare hex, comma-joined, without the `#`: it would have to be written `%23`, and the Board is meant to be repairable by hand (ADR 0002).
