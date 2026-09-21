# The Board URL carries configuration only, never progress

The URL holds the roster, colours, background and turn length, and does not change during a standup. Who has already spoken, and who is Away today, live in `sessionStorage` keyed to the Board, so refreshing mid-standup restores the wheel.

The alternative — rewriting the URL on every spin — was rejected because it makes a shared link correct only until the first spin, turns the back button into an "un-spin", and fills browser history with near-identical entries. Keeping progress out of the URL means a link pasted in a team channel always hands the recipient a full wheel.

## Names are comma-joined and human-readable, not packed

Participants are stored as a single percent-encoded, comma-joined parameter rather than a compact base64 blob. The Board is meant to be repairable by hand — swapping a name from a phone, without opening the app — and an opaque blob forecloses that. The extra URL length is not a real cost at team scale.
