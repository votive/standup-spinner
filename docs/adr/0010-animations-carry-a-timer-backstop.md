# Every animation carries a timer backstop as well as requestAnimationFrame

The spin and the wedge sweep are animated with `requestAnimationFrame`, and each one *also* sets a `setTimeout` that settles it regardless. The two are guarded so whichever fires first wins and the other becomes a no-op.

This looks redundant and is not. Browsers stop `requestAnimationFrame` entirely for a hidden tab, and the spin holds a `busy` flag that locks out every other control until it completes. A facilitator who presses Spin and immediately switches to another tab would return to a wheel frozen mid-rotation with the rest of the app dead behind it — which is exactly what happened in testing, in a pane that stayed hidden. The animation is driven by elapsed timestamps rather than by counting frames, so the backstop lands the wheel in precisely the right place; the only thing lost is the motion nobody was watching.

Do not remove the timers as duplication. If the animation ever gains a new exit path, that path needs to go through the same guard.
