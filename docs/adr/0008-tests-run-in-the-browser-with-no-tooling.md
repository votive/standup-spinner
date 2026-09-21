# Tests run in the browser, with no test runner

There is no npm, no bundler and no Vitest. Tests live in `tests.html`, which loads the same `app.js` the app does, runs its assertions in the browser and prints the results. It opens by double-clicking the file.

This covers the three pure, genuinely breakable parts: the Board URL codec (unicode and punctuation round-tripping), eligibility selection (spoken, away, and the degenerate cases), and the solver that converts a chosen winner into a final rotation angle. Those are where a bug would be silent and embarrassing — landing on someone who has already spoken.

Introducing a test runner would mean introducing a build step for the whole project, which is a much larger decision (see ADR 0006) and would be paid for by every future edit. Animation, audio and layout remain verified by eye, because that is how they would be verified anyway.
