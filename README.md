# Standup Spinner

A wheel that picks who speaks next at standup, and keeps each turn to two minutes.

Open the link your team shares, press **Spin**, and the wheel lands on someone. They talk; the clock runs. Press **Next** and they come off the wheel and it spins again. When everybody has had a turn you get a summary of how long it all took.

No accounts, no server, nothing to install.

## Three things that aren't obvious

**The link is the save file.** Your team's names live in the URL itself, not on a server. Paste that link into your team channel once and it works forever — for anyone who opens it, on any machine. Change the names in Setup and the link in your address bar changes with them, so grab the new one (there's a **Copy board link** button) if you want the change to stick for everyone else.

**Away is just for today.** Unticking someone in Setup — or clicking their wedge — takes them off the wheel for this standup only. It never changes the link. Tomorrow everyone is back.

**Refreshing is safe; closing the tab isn't.** Reload mid-standup and you get everything back, including a clock that carried on running while the page reloaded. Close the tab and the round starts fresh. That's deliberate — an accidental refresh four people in shouldn't put two of them back in the hat.

To start over on purpose, there's **Start again** in Setup. It puts everyone back on the wheel and clears the clock, and you get a few seconds to undo it if you didn't mean it. Who's away today stays away, because a restart is still the same day.

## Driving it

| | |
|---|---|
| **Space** | Spin, and move to the next person |
| **S** | Start or pause the clock |
| **Esc** | Open and close Setup |
| Click a wedge | Mark that person away today (with an undo) |

Mid-standup, **Setup → Start again** puts everyone back on the wheel.

The clock doesn't cut anyone off. At zero it turns red and starts counting *up*, so a turn that ran to 2:47 says so — in front of everyone — without anybody having to be the person who interrupts.

## The link, in full

Everything lives in the query string. All of it is optional except the names.

| Parameter | What it does | Default |
|---|---|---|
| `p` | The names, comma-separated | — |
| `t` | Seconds per turn, 15–3600 | `120` |
| `theme` | `showtime`, `neon`, `sunrise`, `forest`, `mono` or `candy` | `showtime` |
| `bg` | A full `https://` address of a background image | none |
| `prompts` | `off`, or your own separated by `\|` | `Yesterday\|Today\|Blockers` |

```
index.html?p=Ayesha,Tom%20B.,Jo,Priya&t=90&theme=neon
```

Anything malformed falls back to its default rather than breaking, unknown parameters are ignored, and every parameter ever shipped keeps working — a link pinned in a channel two years ago will still open.

Two names the same is the one thing it won't accept: the wheel has no way to tell two Toms apart, so it asks you to make one of them `Tom B.` before it will spin.

## Running it yourself

It's three files and no build step. Open `index.html` in a browser and it works.

To serve it locally:

```bash
python3 -m http.server 4173
```

Then open <http://localhost:4173/index.html?p=Ada,Grace,Hopper>.

Tests live in `tests.html` — open the file and it runs them. No npm, no test runner.

## Deploying

Any static host will do. On GitHub Pages: push to `main`, then **Settings → Pages → Deploy from a branch → `main` / root**. There's nothing to build.

## If you're changing it

`CONTEXT.md` defines the vocabulary — participant, board, session, turn and the rest — and `docs/adr/` records the decisions that a reader would otherwise have to guess at, including several that look arbitrary and are not.
