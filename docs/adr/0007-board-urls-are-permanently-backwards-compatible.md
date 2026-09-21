# Board URLs are permanently backwards-compatible

The Board URL is the app's only persistent interface: a team pastes one into a channel and it stays pinned there for years. There is deliberately no schema version parameter, because bumping a version is a way of giving yourself permission to break old links.

The rule instead is that every query key ever shipped stays readable forever. New settings arrive as new keys with sensible defaults; unknown keys are ignored; a malformed value silently falls back to its default rather than erroring. A Board that worked once must keep working, and a link should never be the reason someone can't start their standup.
