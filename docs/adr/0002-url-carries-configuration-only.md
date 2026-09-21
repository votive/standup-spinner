# The Board URL carries configuration only, never progress

The URL holds the roster, colours, background and turn length, and does not change during a standup. Who has already spoken, who is Away today, and the clock on the current turn live in `sessionStorage`, so refreshing mid-standup restores the wheel exactly — including a timer that was running, because the clock is driven by timestamps rather than by counting ticks.

The alternative — rewriting the URL on every spin — was rejected because it makes a shared link correct only until the first spin, turns the back button into an "un-spin", and fills browser history with near-identical entries. Keeping progress out of the URL means a link pasted in a team channel always hands the recipient a full wheel.

## Names are comma-joined and human-readable, not packed

Participants are stored as a single percent-encoded, comma-joined parameter rather than a compact base64 blob. The Board is meant to be repairable by hand — swapping a name from a phone, without opening the app — and an opaque blob forecloses that. The extra URL length is not a real cost at team scale.


## One Session per tab, not one per Board

An earlier draft of this decision said the Session was keyed to the Board. That conflicts with ADR 0005: progress is keyed by participant name precisely so that editing the roster mid-standup does not reset the round, and keying the Session to the whole Board would undo that on the first edit. `sessionStorage` is already scoped to a single tab, which is the right lifetime for one standup, so the Session is stored under one key and restored regardless of how the Board has since been edited. Names that have left the roster match nobody and are ignored.
