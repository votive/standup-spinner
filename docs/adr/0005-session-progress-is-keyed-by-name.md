# Session progress is keyed by participant name

Who has already spoken is recorded as a set of participant names, not as wedge indices or a hash of the Board. This makes mid-standup roster edits non-destructive: a latecomer added in the Setup panel drops onto the live wheel without resetting the round, and a removed participant disappears cleanly.

The trade-off is that renaming a participant mid-Session makes them eligible again, because the new name matches nothing in the spoken set. This is accepted: hashing the Board and resetting on any change would penalise the common case (editing the roster during standup) to defend against a rare one. An explicit "Reset round" control covers deliberate restarts.

## Participant names must therefore be unique

Keying on names means a roster containing the same name twice is ambiguous: one Spin would mark both wedges spoken and the second person would never speak. Duplicates are rejected at setup rather than resolved at runtime — the Setup panel flags them and disables spinning until they are disambiguated. Teams already say "Tom B." out loud, so this asks for information that exists; the alternative, a hidden per-wedge index, reintroduces precisely the fragility this decision avoids.
