# Standup Spinner

A single-screen, screen-shared tool that picks the order in which a team speaks at daily standup, and caps how long each person holds the floor.

## Language

**Participant**:
A person in the team roster, identified by their name. Someone remains a participant after they have spoken. Names are unique within a Roster: two people called Tom must be distinguished before the wheel can spin.
_Avoid_: player, contestant

**Roster**:
The full set of participants. Membership changes only by editing the Board, never as a consequence of spinning.
_Avoid_: list, team, wheel

**Board**:
The shareable URL carrying the entire configuration: roster, colours, background, turn length. Stable for the life of a team and pasted into a team channel once.
_Avoid_: config link, saved state, permalink

**Present / Away**:
Whether a participant is attending today. Away participants are removed from the wheel entirely and listed separately beneath it, but stay in the Roster and the Board.
_Avoid_: active, enabled, disabled

**Spoken**:
A participant who has already held the floor this Session. Their wedge stays on the wheel, dimmed, until the next Spin sweeps it away.
_Avoid_: done, used, eliminated

**Eligible**:
A participant who is Present and has not yet spoken — the set the wheel is allowed to land on.

**Spin**:
One rotation of the wheel, resolving to exactly one eligible participant.

**Speaker**:
The participant the wheel most recently landed on; the one currently holding the floor. There is at most one at a time.
_Avoid_: current player, winner, chosen one

**Turn**:
The Speaker's window to talk, bounded by the turn length.
_Avoid_: go, slot

**Overtime**:
Time elapsed beyond the turn length. Counts upward and never ends the Turn on its own.

**Session**:
One run-through of a standup: which participants have spoken, and who is Away. Lives only in the current browser tab and is discarded when it closes.
_Avoid_: round, game, meeting

**Setup panel**:
The slide-out editor where the Roster and appearance are changed. Every edit rewrites the Board URL in place.
_Avoid_: settings, admin, config screen

**Speaker view**:
The layout the app switches to once a Spin resolves: the Speaker's name, the Prompts, and the Turn timer, with the wheel shrunk aside.
_Avoid_: turn screen, result screen

**Prompts**:
The three things a Speaker is expected to cover during their Turn: yesterday, today, blockers.
_Avoid_: questions, agenda

**Theme**:
A named, hand-designed palette that determines wedge colours, background and accents. Chosen by name in the Board, not assembled from individual colour values.
_Avoid_: skin, style, colour scheme

**End card**:
The screen shown once no eligible participants remain: total elapsed time, speaking order, and who went into Overtime.
_Avoid_: summary, game over

**Untimed Turn**:
A Turn during which the timer was never started. Recorded as untimed on the End card rather than as a zero-length Turn.
