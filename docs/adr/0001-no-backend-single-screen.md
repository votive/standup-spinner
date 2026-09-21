# No backend; the spinner is a single screen-shared client

Standup already happens around one shared screen, so the facilitator's browser is the only client that needs to see the wheel. Synchronising spins across everyone's machine would require a server, a room concept, and rules about who may press Spin — a large amount of machinery for a ceremony that already has a shared screen open. The spinner is therefore a static site with no server component, no accounts, and no persistence beyond the user's own browser.

## Consequences

Two people opening the same Board URL run two independent Sessions. That is accepted: the Board is a team's configuration, not a live room.
