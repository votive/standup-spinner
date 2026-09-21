# Palette order and label ink are load-bearing, not decoration

Two things about the themes look arbitrary and are not.

**The order of each palette's colours matters.** The wheel wraps, so a palette's first and last entries end up side by side on a full roster. Each palette is ordered to maximise the smallest perceptual gap between neighbouring wedges; Candy originally opened and closed on two near-identical pinks, which met every test that compared colour *indices* and still looked wrong on screen. `tests.html` now holds every palette to a minimum neighbour distance, so reordering one for tidiness will fail the suite rather than quietly reintroduce the problem.

**Label ink is chosen by measured contrast, not by a luminance threshold.** An earlier version picked black or white by testing whether a wedge's luminance exceeded a guessed value, which put mid-tone oranges, corals and greens below 4.5:1 with white text across four of the six themes. The black/white crossover is close to 0.179, and rather than encode that number, `inkFor` compares the two ratios and takes the better one. The palettes themselves needed no changes once the ink was chosen correctly.

Both rules are enforced by tests, because both failures are invisible in code review and obvious only on screen.
