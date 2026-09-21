/* Standup Spinner
 *
 * Loaded by index.html (the app) and by tests.html (the logic only).
 * Everything above the BOOT section is pure and testable; nothing there
 * touches the DOM. See docs/adr/ for why things are the way they are.
 */
(function (global) {
  'use strict';

  var MAX_PARTICIPANTS = 30;
  var MAX_NAME_LENGTH = 40;
  var DEFAULT_TURN_SECONDS = 120;
  var MIN_TURN_SECONDS = 15;
  var MAX_TURN_SECONDS = 3600;
  var DEFAULT_PROMPTS = ['Yesterday', 'Today', 'Blockers'];
  var DEFAULT_THEME = 'showtime';

  /* ---------------------------------------------------------------- themes
   * Hand-designed palettes (ADR: themes are chosen by name, never assembled
   * from individual colour values). `wedges` cycles; `ink` is picked per
   * wedge by luminance so labels always clear contrast.
   */
  var THEMES = {
    showtime: {
      label: 'Showtime',
      wedges: ['#c1121f', '#f2b705', '#8c0f1a', '#e08d0b', '#a50e1f', '#ffd447'],
      bg: 'radial-gradient(ellipse at 50% 0%, #4a0d14 0%, #1a0508 60%, #0d0305 100%)',
      accent: '#ffd447',
      rim: '#f2b705',
      text: '#fff6e5'
    },
    neon: {
      label: 'Neon',
      wedges: ['#ff2d95', '#00e5ff', '#7b2dff', '#ff6b35', '#c026d3', '#00ffa3'],
      bg: 'radial-gradient(ellipse at 50% 0%, #1e1035 0%, #0b0618 60%, #05030d 100%)',
      accent: '#00e5ff',
      rim: '#ff2d95',
      text: '#f0eaff'
    },
    sunrise: {
      label: 'Sunrise',
      wedges: ['#ff7043', '#ffb300', '#ef5350', '#ff8a65', '#f4511e', '#ffd54f'],
      bg: 'radial-gradient(ellipse at 50% 0%, #fff3e0 0%, #ffe0b2 55%, #ffccbc 100%)',
      accent: '#e64a19',
      rim: '#ffffff',
      text: '#3e2723'
    },
    forest: {
      label: 'Forest',
      wedges: ['#2e7d32', '#8d6e63', '#1b5e20', '#43a047', '#6d4c41', '#a1887f'],
      bg: 'radial-gradient(ellipse at 50% 0%, #17301c 0%, #0d1b10 60%, #060d08 100%)',
      accent: '#d4a373',
      rim: '#d4a373',
      text: '#eef6ec'
    },
    mono: {
      label: 'Mono',
      wedges: ['#2b2b2b', '#4a4a4a', '#1a1a1a', '#5c5c5c', '#383838', '#6e6e6e'],
      bg: 'radial-gradient(ellipse at 50% 0%, #1c1c1c 0%, #101010 60%, #050505 100%)',
      accent: '#f5f5f5',
      rim: '#9e9e9e',
      text: '#f5f5f5'
    },
    candy: {
      label: 'Candy',
      wedges: ['#ff8fab', '#8ecae6', '#ffafcc', '#b5e48c', '#cdb4db', '#ffd670'],
      bg: 'radial-gradient(ellipse at 50% 0%, #fdf0f5 0%, #e8f3fb 60%, #eae4f7 100%)',
      accent: '#d1467a',
      rim: '#ffffff',
      text: '#33243a'
    }
  };

  function themeNames() {
    return Object.keys(THEMES);
  }

  function theme(name) {
    return THEMES[name] || THEMES[DEFAULT_THEME];
  }

  /* ------------------------------------------------------------ query string
   * Hand-rolled rather than URLSearchParams: participants are individually
   * percent-encoded and joined with commas, and URLSearchParams would
   * double-encode the separators on the way back out.
   */
  function parseQuery(search) {
    var out = {};
    var q = String(search || '');
    if (q.charAt(0) === '?') q = q.slice(1);
    if (!q) return out;
    q.split('&').forEach(function (pair) {
      if (!pair) return;
      var i = pair.indexOf('=');
      var key = i === -1 ? pair : pair.slice(0, i);
      var val = i === -1 ? '' : pair.slice(i + 1);
      if (key) out[decodeURIComponent(key)] = val;
    });
    return out;
  }

  function decodeSafe(s) {
    try {
      return decodeURIComponent(String(s).replace(/\+/g, ' '));
    } catch (e) {
      return String(s);
    }
  }

  function splitEncodedList(raw, separator) {
    if (!raw) return [];
    return String(raw)
      .split(separator)
      .map(function (part) { return decodeSafe(part).trim(); })
      .filter(function (part) { return part.length > 0; });
  }

  /* ------------------------------------------------------------------ board
   * The Board is the entire configuration and lives only in the URL.
   * Malformed values fall back to their default; unknown keys are ignored;
   * every key ever shipped stays readable (ADR 0007).
   */
  function parseBoard(search) {
    var q = parseQuery(search);

    var participants = splitEncodedList(q.p, ',')
      .map(function (name) { return name.slice(0, MAX_NAME_LENGTH); })
      .slice(0, MAX_PARTICIPANTS);

    var turnSeconds = DEFAULT_TURN_SECONDS;
    if (q.t !== undefined) {
      var parsed = parseInt(decodeSafe(q.t), 10);
      if (isFinite(parsed) && parsed > 0) {
        turnSeconds = Math.min(MAX_TURN_SECONDS, Math.max(MIN_TURN_SECONDS, parsed));
      }
    }

    var themeName = q.theme ? decodeSafe(q.theme).toLowerCase() : DEFAULT_THEME;
    if (!THEMES[themeName]) themeName = DEFAULT_THEME;

    var prompts = DEFAULT_PROMPTS.slice();
    if (q.prompts !== undefined) {
      var rawPrompts = decodeSafe(q.prompts);
      if (rawPrompts.toLowerCase() === 'off') {
        prompts = [];
      } else {
        var custom = splitEncodedList(q.prompts, '|');
        if (custom.length) prompts = custom;
      }
    }

    return {
      participants: participants,
      turnSeconds: turnSeconds,
      theme: themeName,
      background: safeImageUrl(q.bg ? decodeSafe(q.bg) : ''),
      prompts: prompts
    };
  }

  /* Only http(s) images. Keeps javascript: and data: out of a URL that gets
   * pasted around a team channel. */
  function safeImageUrl(url) {
    if (!url) return '';
    return /^https?:\/\/\S+$/i.test(url) ? url : '';
  }

  function serializeBoard(board) {
    var parts = [];
    var names = (board.participants || []).map(encodeURIComponent).join(',');
    if (names) parts.push('p=' + names);
    if (board.turnSeconds && board.turnSeconds !== DEFAULT_TURN_SECONDS) {
      parts.push('t=' + board.turnSeconds);
    }
    if (board.theme && board.theme !== DEFAULT_THEME) {
      parts.push('theme=' + encodeURIComponent(board.theme));
    }
    if (board.background) parts.push('bg=' + encodeURIComponent(board.background));

    var prompts = board.prompts || DEFAULT_PROMPTS;
    if (!prompts.length) {
      parts.push('prompts=off');
    } else if (!sameList(prompts, DEFAULT_PROMPTS)) {
      parts.push('prompts=' + prompts.map(encodeURIComponent).join('|'));
    }
    return parts.length ? '?' + parts.join('&') : '';
  }

  function sameList(a, b) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  /* --------------------------------------------------------------- roster */
  function parseRosterText(text) {
    return String(text || '')
      .split(/\r?\n/)
      .map(function (line) { return line.trim().slice(0, MAX_NAME_LENGTH); })
      .filter(function (line) { return line.length > 0; })
      .slice(0, MAX_PARTICIPANTS);
  }

  /* Names identify participants, so duplicates are ambiguous and are
   * rejected at setup rather than resolved at runtime (ADR 0005). */
  function findDuplicates(names) {
    var seen = Object.create(null);
    var dupes = [];
    (names || []).forEach(function (name) {
      var key = name.toLowerCase();
      if (seen[key]) {
        if (dupes.indexOf(name) === -1) dupes.push(name);
      } else {
        seen[key] = true;
      }
    });
    return dupes;
  }

  /* ---------------------------------------------------------- eligibility */
  function eligible(participants, spoken, away) {
    var spokenSet = toSet(spoken);
    var awaySet = toSet(away);
    return (participants || []).filter(function (name) {
      return !spokenSet[name] && !awaySet[name];
    });
  }

  function toSet(list) {
    var set = Object.create(null);
    (list || []).forEach(function (item) { set[item] = true; });
    return set;
  }

  /* One of: 'setup' (no roster), 'all-away', 'ready', 'complete'. */
  function rosterState(participants, spoken, away) {
    if (!participants || !participants.length) return 'setup';
    var present = participants.filter(function (n) { return toSet(away)[n] !== true; });
    if (!present.length) return 'all-away';
    if (eligible(participants, spoken, away).length === 0) return 'complete';
    return 'ready';
  }

  /* ---------------------------------------------------------------- spin
   * The winner is chosen first, uniformly, and the rotation is solved
   * backwards to land on them (ADR 0003).
   */
  function pickWinner(eligibleNames, random) {
    if (!eligibleNames || !eligibleNames.length) return null;
    var rng = random || Math.random;
    var index = Math.floor(rng() * eligibleNames.length);
    if (index >= eligibleNames.length) index = eligibleNames.length - 1;
    return eligibleNames[index];
  }

  var TAU = Math.PI * 2;

  /* Wedge 0 starts at the pointer (12 o'clock) and they run clockwise.
   * Returns an absolute angle >= currentAngle that puts the winning wedge's
   * centre exactly under the pointer after `fullTurns` whole rotations. */
  function solveRotation(currentAngle, winnerIndex, wedgeCount, fullTurns) {
    if (!wedgeCount || wedgeCount < 1) return currentAngle;
    var step = TAU / wedgeCount;
    var wedgeCentre = (winnerIndex + 0.5) * step;
    var target = -wedgeCentre;
    var delta = (target - currentAngle) % TAU;
    if (delta < 0) delta += TAU;
    return currentAngle + (fullTurns || 0) * TAU + delta;
  }

  /* Which wedge currently sits under the pointer. Inverse of solveRotation;
   * used by the tests to prove the solver lands where it claims. */
  function wedgeAtPointer(angle, wedgeCount) {
    if (!wedgeCount || wedgeCount < 1) return -1;
    var step = TAU / wedgeCount;
    var normalised = ((-angle) % TAU + TAU) % TAU;
    return Math.floor(normalised / step) % wedgeCount;
  }

  /* --------------------------------------------------------------- timing */
  function formatClock(seconds) {
    var total = Math.max(0, Math.floor(seconds));
    var mins = Math.floor(total / 60);
    var secs = total % 60;
    return mins + ':' + (secs < 10 ? '0' : '') + secs;
  }

  /* Negative remaining time reads as overtime, counting up. */
  function formatRemaining(remainingSeconds) {
    if (remainingSeconds >= 0) return formatClock(remainingSeconds);
    return '+' + formatClock(Math.abs(remainingSeconds));
  }

  /* ---------------------------------------------------------------- colour */
  function hexToRgb(hex) {
    var h = String(hex).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16)
    };
  }

  function rgbToCss(c, alpha) {
    return 'rgba(' + Math.round(c.r) + ',' + Math.round(c.g) + ',' + Math.round(c.b) + ',' +
      (alpha === undefined ? 1 : alpha) + ')';
  }

  function relativeLuminance(hex) {
    var c = hexToRgb(hex);
    var chan = [c.r, c.g, c.b].map(function (v) {
      v = v / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * chan[0] + 0.7152 * chan[1] + 0.0722 * chan[2];
  }

  var INK_DARK = '#161016';
  var INK_LIGHT = '#ffffff';

  function contrastRatio(a, b) {
    var first = relativeLuminance(a);
    var second = relativeLuminance(b);
    var lighter = Math.max(first, second);
    var darker = Math.min(first, second);
    return (lighter + 0.05) / (darker + 0.05);
  }

  /* Label colour chosen per wedge by measured contrast, not by a luminance
   * threshold: the black/white crossover sits near 0.179, and guessing it
   * puts mid-tone wedges — oranges, corals, mid greens — below 4.5:1 with
   * white text. tests.html holds every palette to that ratio. */
  function inkFor(hex) {
    return contrastRatio(hex, INK_DARK) >= contrastRatio(hex, INK_LIGHT) ? INK_DARK : INK_LIGHT;
  }

  /* How different two colours look, by the "redmean" approximation. Used to
   * keep neighbouring wedges apart: a palette's order matters because the
   * wheel wraps, so its first and last colours are neighbours too. */
  function colourDistance(a, b) {
    var first = hexToRgb(a), second = hexToRgb(b);
    var meanRed = (first.r + second.r) / 2;
    var dr = first.r - second.r, dg = first.g - second.g, db = first.b - second.b;
    return Math.sqrt(
      (2 + meanRed / 256) * dr * dr +
      4 * dg * dg +
      (2 + (255 - meanRed) / 256) * db * db
    );
  }

  /* Spread the palette across the roster instead of cycling through it, so a
   * three-person wheel does not land on three neighbouring hues. */
  function paletteIndex(position, rosterSize, paletteLength) {
    if (paletteLength < 1 || rosterSize < 1) return 0;
    if (rosterSize <= paletteLength) {
      return Math.round(position * paletteLength / rosterSize) % paletteLength;
    }
    var index = position % paletteLength;
    /* The wheel wraps, so the last wedge must not repeat the first's colour. */
    if (position === rosterSize - 1 && index === 0) index = Math.floor(paletteLength / 2);
    return index;
  }

  function mixHex(hex, towards, amount) {
    var a = hexToRgb(hex), b = hexToRgb(towards);
    return {
      r: a.r + (b.r - a.r) * amount,
      g: a.g + (b.g - a.g) * amount,
      b: a.b + (b.b - a.b) * amount
    };
  }

  function shade(hex, amount) {
    return rgbToCss(mixHex(hex, amount < 0 ? '#000000' : '#ffffff', Math.abs(amount)));
  }

  /* A spoken wedge is drained of colour but still legible: it stays on the
   * wheel until the next spin sweeps it away. */
  function drained(hex) {
    return rgbToCss(mixHex(hex, '#6a6a6a', 0.72));
  }

  global.Spinner = {
    MAX_PARTICIPANTS: MAX_PARTICIPANTS,
    MAX_NAME_LENGTH: MAX_NAME_LENGTH,
    DEFAULT_TURN_SECONDS: DEFAULT_TURN_SECONDS,
    DEFAULT_PROMPTS: DEFAULT_PROMPTS,
    DEFAULT_THEME: DEFAULT_THEME,
    THEMES: THEMES,
    themeNames: themeNames,
    theme: theme,
    parseQuery: parseQuery,
    parseBoard: parseBoard,
    serializeBoard: serializeBoard,
    safeImageUrl: safeImageUrl,
    parseRosterText: parseRosterText,
    findDuplicates: findDuplicates,
    eligible: eligible,
    rosterState: rosterState,
    pickWinner: pickWinner,
    solveRotation: solveRotation,
    wedgeAtPointer: wedgeAtPointer,
    formatClock: formatClock,
    formatRemaining: formatRemaining,
    inkFor: inkFor,
    contrastRatio: contrastRatio,
    paletteIndex: paletteIndex,
    colourDistance: colourDistance,
    relativeLuminance: relativeLuminance,
    shade: shade,
    drained: drained,
    TAU: TAU
  };
})(typeof window !== 'undefined' ? window : globalThis);

/* ============================================================== THE WHEEL
 * Canvas, scaled to devicePixelRatio (ADR 0004). Wedges carry a weight so a
 * spoken wedge can collapse to nothing before the next spin, which is how
 * "the next spin sweeps them away" is implemented.
 */
(function (global) {
  'use strict';
  var S = global.Spinner;
  var TAU = S.TAU;
  /* Three o'clock: the winning wedge lands on the right, where its label is
   * already running horizontally and is read without tilting your head. */
  var POINTER_ANGLE = 0;
  var POINTER_OVERHANG = 0.055;

  function Wheel(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.rotation = 0;
    this.wedges = [];
    this.palette = S.theme(S.DEFAULT_THEME);
    this.size = 0;
    this.width = 0;
    this.height = 0;
    this.onResize = null;
    this.pointerKick = 0;
    this.bulbPhase = 0;
    this.spinning = false;
  }

  Wheel.prototype.setTheme = function (palette) {
    this.palette = palette;
    this.draw();
  };

  Wheel.prototype.setWedges = function (wedges) {
    this.wedges = wedges;
    this.draw();
  };

  /* The canvas fills whatever box it is given; the wheel is the largest
   * circle that fits, centred inside it. Keeping the element and the drawing
   * independent means no CSS aspect-ratio gymnastics and never a stretched
   * ellipse. */
  Wheel.prototype.resize = function () {
    var rect = this.canvas.getBoundingClientRect();
    var dpr = global.devicePixelRatio || 1;
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);
    this.size = Math.min(this.width, this.height);
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.onResize) this.onResize(this.size);
    this.draw();
  };

  Wheel.prototype.metrics = function () {
    var size = this.size;
    var rimWidth = Math.max(8, size * 0.046);
    /* The marker overhangs the rim, so the wheel is inset to leave room for
       it rather than letting it clip against the canvas edge. */
    var outer = size / 2 - 2 - size * POINTER_OVERHANG;
    return {
      size: size,
      cx: this.width / 2,
      cy: this.height / 2,
      rimWidth: rimWidth,
      outer: outer,
      radius: outer - rimWidth
    };
  };

  /* Which wedge is under a point, in CSS pixels relative to the canvas.
   * Returns null for the rim, the hub and anything outside. */
  Wheel.prototype.wedgeAt = function (x, y) {
    var m = this.metrics();
    var total = this.totalWeight();
    if (m.radius < 2 || !this.wedges.length || total <= 0) return null;

    var dx = x - m.cx, dy = y - m.cy;
    var distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > m.radius || distance < m.size * 0.12) return null;

    var relative = ((Math.atan2(dy, dx) - POINTER_ANGLE - this.rotation) % TAU + TAU) % TAU;
    var accumulated = 0;
    for (var i = 0; i < this.wedges.length; i++) {
      accumulated += (this.wedges[i].weight / total) * TAU;
      if (relative < accumulated) return this.wedges[i];
    }
    return this.wedges[this.wedges.length - 1];
  };

  Wheel.prototype.totalWeight = function () {
    return this.wedges.reduce(function (sum, w) { return sum + w.weight; }, 0);
  };

  Wheel.prototype.draw = function () {
    var ctx = this.ctx;
    var size = this.size;
    if (!size) return;

    var m = this.metrics();
    var cx = m.cx, cy = m.cy;
    var rimWidth = m.rimWidth;
    var outer = m.outer;
    var radius = m.radius;

    ctx.clearRect(0, 0, this.width, this.height);

    /* The wheel's column collapses to nothing on the end card, and a window
       can be dragged arbitrarily small: below this there is no circle to draw,
       and the gradients would be handed a negative radius. */
    if (radius < 2) return;

    var total = this.totalWeight();
    if (!this.wedges.length || total <= 0) {
      this.drawEmpty(ctx, cx, cy, radius, outer, rimWidth);
      return;
    }

    /* wedges */
    var angle = POINTER_ANGLE + this.rotation;
    var self = this;
    this.wedges.forEach(function (wedge, i) {
      var sweep = (wedge.weight / total) * TAU;
      if (sweep <= 0.0001) return;
      self.drawWedge(ctx, cx, cy, radius, angle, sweep, wedge, i);
      angle += sweep;
    });

    /* separators sit on top so they stay crisp over the gradients */
    angle = POINTER_ANGLE + this.rotation;
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,.28)';
    ctx.lineWidth = Math.max(1, size * 0.0035);
    this.wedges.forEach(function (wedge) {
      var sweep = (wedge.weight / total) * TAU;
      if (sweep <= 0.0001) return;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
      ctx.stroke();
      angle += sweep;
    });
    ctx.restore();

    this.drawRim(ctx, cx, cy, outer, rimWidth);
    this.drawPointer(ctx, cx, cy, outer, rimWidth);
  };

  Wheel.prototype.drawWedge = function (ctx, cx, cy, radius, start, sweep, wedge, index) {
    var palette = this.palette;
    var colourIndex = wedge.colorIndex === undefined ? index : wedge.colorIndex;
    var base = palette.wedges[colourIndex % palette.wedges.length];
    var fillTop, fillBottom, ink;

    if (wedge.spoken) {
      fillTop = S.drained(base);
      fillBottom = S.drained(base);
      ink = 'rgba(255,255,255,.8)';
    } else {
      fillTop = S.shade(base, 0.16);
      fillBottom = S.shade(base, -0.2);
      ink = S.inkFor(base);
    }

    var grad = ctx.createRadialGradient(cx, cy, radius * 0.12, cx, cy, radius);
    grad.addColorStop(0, fillTop);
    grad.addColorStop(1, fillBottom);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, start, start + sweep);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();

    if (sweep < 0.06) return; /* too thin to letter */
    this.drawLabel(ctx, cx, cy, radius, start + sweep / 2, sweep, wedge, ink);
  };

  /* Labels run along the radius, reading outward toward the rim, at a uniform
   * orientation all the way round — so the left half sits upside down, the way
   * a real wheel's lettering does. The marker is at three o'clock, so the wedge
   * that actually matters is always the right way up. */
  Wheel.prototype.drawLabel = function (ctx, cx, cy, radius, mid, sweep, wedge, ink) {
    var size = this.size;
    var weight = wedge.spoken ? '500' : '700';
    var outerStop = radius * 0.9;
    var maxWidth = radius * 0.6;

    /* Height has to fit the wedge where it is narrowest: its inner end. */
    var fontSize = Math.min(size * 0.055, sweep * radius * 0.24);
    fontSize = Math.max(10, fontSize);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(mid);

    ctx.fillStyle = ink;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';
    ctx.shadowColor = 'rgba(0,0,0,.35)';
    ctx.shadowBlur = size * 0.008;

    var text = fitText(ctx, wedge.name, maxWidth, fontSize, weight);
    ctx.fillText(text.label, outerStop, 0);

    if (wedge.spoken) {
      var w = ctx.measureText(text.label).width;
      ctx.shadowBlur = 0;
      ctx.strokeStyle = ink;
      ctx.lineWidth = Math.max(1, text.size * 0.08);
      ctx.beginPath();
      ctx.moveTo(outerStop - w, 0);
      ctx.lineTo(outerStop, 0);
      ctx.stroke();
    }
    ctx.restore();
  };

  /* Shrink to fit, then truncate with an ellipsis. Sets the font as a side
   * effect so the caller can measure what was actually drawn. */
  function fitText(ctx, label, maxWidth, startSize, weight) {
    var size = startSize;
    var font = function (s) {
      ctx.font = weight + ' ' + s.toFixed(1) + 'px "Avenir Next", "Segoe UI", system-ui, sans-serif';
    };
    font(size);
    while (ctx.measureText(label).width > maxWidth && size > 9) {
      size -= 0.5;
      font(size);
    }
    /* Only truncate a label that genuinely does not fit: measuring the
       ellipsis unconditionally would clip names that fit perfectly well. */
    var text = label;
    if (ctx.measureText(text).width > maxWidth) {
      while (ctx.measureText(text + '…').width > maxWidth && text.length > 1) {
        text = text.slice(0, -1);
      }
      text += '…';
    }
    return { label: text, size: size };
  }

  Wheel.prototype.drawRim = function (ctx, cx, cy, outer, rimWidth) {
    var palette = this.palette;
    var mid = outer - rimWidth / 2;

    var grad = ctx.createLinearGradient(cx - outer, cy - outer, cx + outer, cy + outer);
    grad.addColorStop(0, S.shade(palette.rim, 0.45));
    grad.addColorStop(0.35, S.shade(palette.rim, -0.1));
    grad.addColorStop(0.6, S.shade(palette.rim, 0.35));
    grad.addColorStop(1, S.shade(palette.rim, -0.35));

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, mid, 0, TAU);
    ctx.strokeStyle = grad;
    ctx.lineWidth = rimWidth;
    ctx.shadowColor = 'rgba(0,0,0,.5)';
    ctx.shadowBlur = this.size * 0.03;
    ctx.shadowOffsetY = this.size * 0.008;
    ctx.stroke();
    ctx.restore();

    /* bulbs */
    var count = 24;
    var bulbRadius = Math.max(1.5, rimWidth * 0.2);
    for (var i = 0; i < count; i++) {
      var a = (i / count) * TAU + this.bulbPhase;
      var lit = ((i + Math.floor(this.bulbPhase * 3)) % 2) === 0;
      var x = cx + Math.cos(a) * mid;
      var y = cy + Math.sin(a) * mid;
      ctx.beginPath();
      ctx.arc(x, y, bulbRadius, 0, TAU);
      ctx.fillStyle = lit ? '#fffbe8' : 'rgba(255,255,255,.22)';
      ctx.shadowColor = lit ? palette.accent : 'transparent';
      ctx.shadowBlur = lit ? this.size * 0.018 : 0;
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  };

  /* Anchored on the rim at POINTER_ANGLE and pointing inward, so moving the
   * marker is a one-constant change. Deliberately not in the theme's accent
   * colour: a gold marker vanishes against a gold rim. */
  Wheel.prototype.drawPointer = function (ctx, cx, cy, outer, rimWidth) {
    var size = this.size;
    var halfWidth = size * 0.045;
    var length = size * 0.1;
    var overlap = size * 0.03;
    /* The tip sits inside the wedges by `overlap`, so which wedge it is on is
       never in question; the base overhangs the rim's outer edge. */
    var tipRadius = outer - rimWidth - overlap + length;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(POINTER_ANGLE);
    ctx.translate(tipRadius, 0);
    ctx.rotate(Math.PI / 2 + this.pointerKick);

    ctx.beginPath();
    ctx.moveTo(0, length);
    ctx.lineTo(-halfWidth, 0);
    ctx.lineTo(halfWidth, 0);
    ctx.closePath();

    var grad = ctx.createLinearGradient(-halfWidth, 0, halfWidth, 0);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.45, '#f4f4f6');
    grad.addColorStop(1, '#b9bcc6');
    ctx.fillStyle = grad;
    ctx.shadowColor = 'rgba(0,0,0,.55)';
    ctx.shadowBlur = size * 0.022;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(12,10,14,.8)';
    ctx.lineWidth = Math.max(1.5, size * 0.005);
    ctx.lineJoin = 'round';
    ctx.stroke();

    /* The hub the flapper pivots on. */
    ctx.beginPath();
    ctx.arc(0, 0, halfWidth * 0.6, 0, TAU);
    var capGrad = ctx.createLinearGradient(0, -halfWidth, 0, halfWidth);
    capGrad.addColorStop(0, '#ffffff');
    capGrad.addColorStop(1, '#8e919b');
    ctx.fillStyle = capGrad;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };

  Wheel.prototype.drawEmpty = function (ctx, cx, cy, radius, outer, rimWidth) {
    var placeholders = 6;
    var step = TAU / placeholders;
    for (var i = 0; i < placeholders; i++) {
      var start = POINTER_ANGLE + i * step;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, start, start + step);
      ctx.closePath();
      ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.055)' : 'rgba(255,255,255,.028)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.07)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    this.drawRim(ctx, cx, cy, outer, rimWidth);
    this.drawPointer(ctx, cx, cy, outer, rimWidth);
  };

  /* Collapse a spoken wedge to nothing, then continue. */
  Wheel.prototype.sweep = function (predicate, done) {
    var self = this;
    var victims = this.wedges.filter(predicate);
    if (!victims.length) { done(); return; }
    var start = null;
    var duration = prefersReducedMotion() ? 0 : 320;
    function frame(now) {
      if (start === null) start = now;
      var t = duration ? Math.min(1, (now - start) / duration) : 1;
      var eased = 1 - Math.pow(1 - t, 3);
      victims.forEach(function (w) { w.weight = 1 - eased; });
      self.draw();
      if (t < 1) { global.requestAnimationFrame(frame); return; }
      self.wedges = self.wedges.filter(function (w) { return victims.indexOf(w) === -1; });
      self.draw();
      done();
    }
    global.requestAnimationFrame(frame);
  };

  /* The winner is already decided; this only animates the journey to them
   * (ADR 0003). onTick fires each time a wedge boundary passes the pointer. */
  Wheel.prototype.spin = function (winnerIndex, opts) {
    var self = this;
    opts = opts || {};
    var count = this.wedges.length;
    var start = this.rotation;
    var turns = 4 + Math.floor(Math.random() * 3);
    var end = S.solveRotation(start, winnerIndex, count, turns);

    if (prefersReducedMotion()) {
      this.rotation = end;
      this.draw();
      global.setTimeout(function () { opts.onDone && opts.onDone(); }, 400);
      return;
    }

    var duration = 4000;
    var startedAt = null;
    var lastWedge = S.wedgeAtPointer(start, count);
    this.spinning = true;

    function frame(now) {
      if (startedAt === null) startedAt = now;
      var t = Math.min(1, (now - startedAt) / duration);
      var eased = 1 - Math.pow(1 - t, 4.2);
      self.rotation = start + (end - start) * eased;
      self.bulbPhase = (self.bulbPhase + 0.06 * (1 - t) + 0.004) % TAU;

      var wedge = S.wedgeAtPointer(self.rotation, count);
      if (wedge !== lastWedge) {
        lastWedge = wedge;
        self.pointerKick = 0.42;
        opts.onTick && opts.onTick(1 - t);
      }
      self.pointerKick *= 0.82;

      self.draw();
      if (t < 1) { global.requestAnimationFrame(frame); return; }
      self.rotation = end;
      self.pointerKick = 0;
      self.spinning = false;
      self.draw();
      opts.onDone && opts.onDone();
    }
    global.requestAnimationFrame(frame);
  };

  function prefersReducedMotion() {
    return global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  global.SpinnerWheel = Wheel;
  global.SpinnerWheel.prefersReducedMotion = prefersReducedMotion;
})(typeof window !== 'undefined' ? window : globalThis);

/* ===================================================================== SOUND
 * Synthesized in the browser: no asset files, no licensing, nothing to load.
 * The context is created on the first gesture, because browsers will not let
 * audio start any earlier.
 */
(function (global) {
  'use strict';
  var STORAGE_KEY = 'spinner:muted';

  function Sound() {
    this.ctx = null;
    this.muted = readMuted();
  }

  /* Browser storage is per-viewer and can throw outright in a private window,
     so it is only ever used for a convenience like this one. */
  function readMuted() {
    try {
      return global.localStorage.getItem(STORAGE_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function writeMuted(muted) {
    try {
      global.localStorage.setItem(STORAGE_KEY, muted ? '1' : '0');
    } catch (e) { /* nothing to do: the session simply will not remember */ }
  }

  Sound.prototype.setMuted = function (muted) {
    this.muted = muted;
    writeMuted(muted);
  };

  /* Call from a click handler: without a gesture the context stays suspended. */
  Sound.prototype.unlock = function () {
    var Ctor = global.AudioContext || global.webkitAudioContext;
    if (!Ctor) return;
    if (!this.ctx) {
      try { this.ctx = new Ctor(); } catch (e) { this.ctx = null; return; }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  };

  Sound.prototype.tone = function (options) {
    if (this.muted || !this.ctx) return;
    var ctx = this.ctx;
    var now = ctx.currentTime + (options.delay || 0);
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();

    osc.type = options.type || 'sine';
    osc.frequency.setValueAtTime(options.freq, now);
    if (options.sweepTo) {
      osc.frequency.exponentialRampToValueAtTime(options.sweepTo, now + options.duration);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(options.volume, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + options.duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + options.duration + 0.02);
  };

  /* One per wedge boundary. The pitch wanders slightly so a fast wheel
   * sounds like a ratchet rather than a machine gun. */
  Sound.prototype.tick = function (remaining) {
    this.tone({
      type: 'square',
      freq: 1500 + Math.random() * 500 - remaining * 300,
      duration: 0.035,
      volume: 0.055
    });
  };

  Sound.prototype.land = function () {
    var notes = [523.25, 659.25, 783.99];
    for (var i = 0; i < notes.length; i++) {
      this.tone({ type: 'triangle', freq: notes[i], duration: 0.42, volume: 0.13, delay: i * 0.055 });
    }
  };

  Sound.prototype.sting = function () {
    var notes = [440, 554.37, 659.25];
    for (var i = 0; i < notes.length; i++) {
      this.tone({ type: 'triangle', freq: notes[i], duration: 0.16, volume: 0.1, delay: i * 0.075 });
    }
  };

  /* The fifteen-second warning is the one that does the work: it is the cue
   * to wrap up, where the buzzer only announces a failure already made. */
  Sound.prototype.warn = function () {
    this.tone({ type: 'sine', freq: 880, duration: 0.16, volume: 0.1 });
    this.tone({ type: 'sine', freq: 880, duration: 0.16, volume: 0.1, delay: 0.22 });
  };

  Sound.prototype.buzz = function () {
    this.tone({ type: 'sawtooth', freq: 165, duration: 0.5, volume: 0.1 });
    this.tone({ type: 'sawtooth', freq: 155, duration: 0.5, volume: 0.1 });
  };

  Sound.prototype.finish = function () {
    var notes = [523.25, 659.25, 783.99, 1046.5];
    for (var i = 0; i < notes.length; i++) {
      this.tone({ type: 'triangle', freq: notes[i], duration: 0.5, volume: 0.11, delay: i * 0.1 });
    }
  };

  global.SpinnerSound = Sound;
})(typeof window !== 'undefined' ? window : globalThis);

/* ==================================================================== BOOT
 * Only runs when the app page is present; tests.html loads this file without
 * an #app element and gets the logic alone.
 */
(function (global) {
  'use strict';
  var doc = global.document;
  if (!doc || !doc.getElementById('app')) return;

  var S = global.Spinner;
  var BASE_TITLE = 'Standup Spinner';

  var els = {
    app: doc.getElementById('app'),
    canvas: doc.getElementById('wheel'),
    wrap: doc.querySelector('.wheel-wrap'),
    spinBtn: doc.getElementById('spinBtn'),
    hubLabel: doc.querySelector('.hub-label'),
    caption: doc.getElementById('caption'),
    bgImage: doc.getElementById('bgImage'),
    announcer: doc.getElementById('announcer'),
    speakerName: doc.getElementById('speakerName'),
    prompts: doc.getElementById('prompts'),
    timer: doc.getElementById('timer'),
    clock: doc.getElementById('clock'),
    timerFill: doc.getElementById('timerFill'),
    timerToggle: doc.getElementById('timerToggle'),
    timerReset: doc.getElementById('timerReset'),
    endTitle: doc.getElementById('endTitle'),
    endSub: doc.getElementById('endSub'),
    order: doc.getElementById('order'),
    newRound: doc.getElementById('newRound'),
    copyLink: doc.getElementById('copyLink'),
    setup: doc.getElementById('setup'),
    setupToggle: doc.getElementById('setupToggle'),
    setupClose: doc.getElementById('setupClose'),
    setupScrim: doc.getElementById('setupScrim'),
    roster: doc.getElementById('roster'),
    rosterHint: doc.getElementById('rosterHint'),
    dupWarn: doc.getElementById('dupWarn'),
    presence: doc.getElementById('presence'),
    turnLength: doc.getElementById('turnLength'),
    copyLinkSetup: doc.getElementById('copyLinkSetup'),
    awayStrip: doc.getElementById('awayStrip'),
    toast: doc.getElementById('toast'),
    toastText: doc.getElementById('toastText'),
    toastUndo: doc.getElementById('toastUndo'),
    themes: doc.getElementById('themes'),
    background: doc.getElementById('background'),
    backgroundHint: doc.getElementById('backgroundHint'),
    muteToggle: doc.getElementById('muteToggle'),
    muteGlyph: doc.getElementById('muteGlyph')
  };

  var state = {
    board: S.parseBoard(global.location.search),
    spoken: [],
    away: [],
    speaker: null,
    turns: [],
    roundStartedAt: null,
    phase: 'idle',
    busy: false,
    setupOpen: false,
    duplicates: [],
    pendingRebuild: false
  };

  var wheel = new global.SpinnerWheel(els.canvas);
  var sound = new global.SpinnerSound();

  /* The hub is a DOM button sitting over the canvas, so it has to track the
     circle the canvas actually drew rather than the element's own box. */
  wheel.onResize = function (size) {
    var hub = Math.round(size * 0.21);
    els.spinBtn.style.width = hub + 'px';
    els.spinBtn.style.height = hub + 'px';
  };

  /* -------------------------------------------------------------- theming */
  function applyTheme() {
    var palette = S.theme(state.board.theme);
    var root = doc.documentElement.style;
    root.setProperty('--bg', palette.bg);
    root.setProperty('--accent', palette.accent);
    root.setProperty('--rim', palette.rim);
    root.setProperty('--text', palette.text);
    root.setProperty('--scrim', state.board.background ? '0.55' : '0');
    wheel.setTheme(palette);
    loadBackground(state.board.background);
  }

  /* Never block on someone else's CDN: the theme renders immediately and the
   * image fades in behind it, or silently never arrives. */
  function loadBackground(url) {
    els.bgImage.classList.remove('loaded');
    els.bgImage.style.backgroundImage = '';
    if (!url) return;
    var img = new global.Image();
    img.onload = function () {
      els.bgImage.style.backgroundImage = 'url("' + url.replace(/"/g, '%22') + '")';
      els.bgImage.classList.add('loaded');
    };
    img.src = url;
  }

  /* ---------------------------------------------------------------- timer
   * Driven by timestamps, never by counting ticks: background tabs throttle
   * timers, and the tab title countdown has to stay right precisely when the
   * facilitator is looking at something else.
   */
  var timer = {
    running: false,
    since: 0,
    accumulated: 0,
    everStarted: false,
    handle: null,
    announcedAt: {}
  };

  function elapsedSeconds() {
    var ms = timer.accumulated + (timer.running ? Date.now() - timer.since : 0);
    return ms / 1000;
  }

  function remainingSeconds() {
    return state.board.turnSeconds - elapsedSeconds();
  }

  function startTimer() {
    if (timer.running) return;
    sound.unlock();
    sound.sting();
    timer.running = true;
    timer.everStarted = true;
    timer.since = Date.now();
    timer.handle = global.setInterval(tickTimer, 200);
    tickTimer();
  }

  function pauseTimer() {
    if (!timer.running) return;
    timer.accumulated += Date.now() - timer.since;
    timer.running = false;
    global.clearInterval(timer.handle);
    timer.handle = null;
    tickTimer();
  }

  function resetTimer() {
    global.clearInterval(timer.handle);
    timer.handle = null;
    timer.running = false;
    timer.accumulated = 0;
    timer.everStarted = false;
    timer.announcedAt = {};
    tickTimer();
  }

  function tickTimer() {
    var remaining = remainingSeconds();
    var overtime = remaining < 0;
    var warning = !overtime && remaining <= 15;

    els.clock.textContent = S.formatRemaining(remaining);
    els.timer.classList.toggle('overtime', overtime);
    els.timer.classList.toggle('warning', warning);
    els.timerToggle.textContent = timer.running ? 'Pause' : (timer.everStarted ? 'Resume' : 'Start');

    var fraction = Math.max(0, Math.min(1, remaining / state.board.turnSeconds));
    els.timerFill.style.transform = 'scaleX(' + (overtime ? 1 : fraction) + ')';

    updateTitle(remaining);
    announceTime(remaining);
  }

  function updateTitle(remaining) {
    if (state.phase === 'speaking' && state.speaker) {
      doc.title = S.formatRemaining(remaining) + ' — ' + state.speaker + ' · ' + BASE_TITLE;
    } else {
      doc.title = BASE_TITLE;
    }
  }

  /* Spoken milestones, once each per turn. */
  var MILESTONES = [
    { at: 60, say: 'One minute left.' },
    { at: 30, say: 'Thirty seconds left.' },
    { at: 15, say: 'Fifteen seconds left.', play: 'warn' },
    { at: 0, say: "Time's up.", play: 'buzz' }
  ];

  function announceTime(remaining) {
    if (!timer.running) return;
    MILESTONES.forEach(function (milestone) {
      if (timer.announcedAt[milestone.at]) return;
      if (remaining > milestone.at) return;
      if (milestone.at > 0 && state.board.turnSeconds <= milestone.at) return;
      timer.announcedAt[milestone.at] = true;
      announce(milestone.say);
      if (milestone.play) sound[milestone.play]();
    });
  }

  /* ---------------------------------------------------------------- wheel */
  function wedgesFromState() {
    var names = S.eligible(state.board.participants, state.spoken, state.away);
    if (state.speaker && state.board.participants.indexOf(state.speaker) !== -1 &&
        state.away.indexOf(state.speaker) === -1) {
      names = names.concat([state.speaker]);
    }
    return names.map(function (name) {
      return {
        name: name,
        weight: 1,
        spoken: name === state.speaker,
        /* Colour follows the participant for the whole standup, so the wheel
           does not repaint itself every time someone leaves it. */
        colorIndex: S.paletteIndex(
          state.board.participants.indexOf(name),
          state.board.participants.length,
          S.theme(state.board.theme).wedges.length
        )
      };
    });
  }

  /* ---------------------------------------------------------------- render */
  function render() {
    var status = S.rosterState(state.board.participants, state.spoken, state.away);
    var remaining = S.eligible(state.board.participants, state.spoken, state.away).length;
    var blocked = state.duplicates.length > 0;

    els.app.className = 'state-' + state.phase +
      (state.busy ? ' spinning' : '') +
      (state.setupOpen ? ' setup-open' : '');

    els.spinBtn.disabled = state.busy || blocked || (!state.speaker && remaining === 0);
    els.hubLabel.textContent = !state.speaker ? 'Spin' : (remaining ? 'Next' : 'Finish');

    /* A live turn outranks the roster's state: emptying the roster mid-round
       should not put "add participants" next to a Finish button. */
    if (blocked) {
      els.caption.textContent = 'Duplicate names — open Setup to fix';
    } else if (state.busy) {
      els.caption.textContent = '';
    } else if (state.phase === 'speaking') {
      els.caption.textContent = remaining ? remaining + ' still to go' : 'Last one';
    } else if (status === 'setup') {
      els.caption.textContent = 'Add participants in Setup to begin';
    } else if (status === 'all-away') {
      els.caption.textContent = "Everyone's away today";
    } else {
      els.caption.textContent = remaining + ' on the wheel';
    }

    renderAwayStrip();

    if (state.phase === 'speaking') {
      els.speakerName.textContent = state.speaker;
      renderPrompts();
    }
    updateTitle(remainingSeconds());
  }

  function renderAwayStrip() {
    var away = state.board.participants.filter(function (name) {
      return state.away.indexOf(name) !== -1;
    });
    els.awayStrip.hidden = away.length === 0;
    els.awayStrip.textContent = away.length ? 'Away today · ' + away.join(', ') : '';
  }

  function renderPrompts() {
    var current = [];
    for (var i = 0; i < els.prompts.children.length; i++) {
      current.push(els.prompts.children[i].textContent);
    }
    if (current.join('\u0000') === state.board.prompts.join('\u0000')) return;
    els.prompts.textContent = '';
    state.board.prompts.forEach(function (prompt) {
      var li = doc.createElement('li');
      li.textContent = prompt;
      els.prompts.appendChild(li);
    });
  }

  function announce(message) {
    els.announcer.textContent = message;
  }

  /* ------------------------------------------------------------ the board
   * The Setup panel is the only way the Board is edited, and every edit is
   * written straight back into the URL. Roster edits are deliberately
   * non-destructive: progress is keyed by name (ADR 0005), so adding a
   * latecomer drops them onto the live wheel without resetting the round.
   */
  function syncUrl() {
    var query = S.serializeBoard(state.board);
    global.history.replaceState(null, '', global.location.pathname + query);
  }

  function rebuildWheel() {
    /* Never reshape the wheel mid-spin: the animation is driving an index
       into the wedge list it started with. */
    if (state.busy) { state.pendingRebuild = true; return; }
    state.pendingRebuild = false;
    wheel.setWedges(wedgesFromState());
  }

  function applyRoster(text) {
    var names = S.parseRosterText(text);
    state.duplicates = S.findDuplicates(names);
    state.board.participants = names;

    /* Away is a fact about today, not part of the Board, but a name that has
       left the roster should not keep haunting the away list. */
    state.away = state.away.filter(function (name) {
      return names.indexOf(name) !== -1;
    });

    syncUrl();
    renderSetupWarnings(text);
    renderPresence();
    rebuildWheel();
    render();
  }

  function renderSetupWarnings(text) {
    var lines = String(text || '').split(/\r?\n/).filter(function (line) {
      return line.trim().length > 0;
    });

    if (state.duplicates.length) {
      els.dupWarn.hidden = false;
      els.dupWarn.textContent = state.duplicates.length === 1
        ? 'Two participants named "' + state.duplicates[0] +
          '". Add a surname or initial — the wheel needs to tell them apart.'
        : 'Duplicate names: ' + state.duplicates.join(', ') +
          '. Add a surname or initial to each.';
    } else {
      els.dupWarn.hidden = true;
      els.dupWarn.textContent = '';
    }

    var count = state.board.participants.length;
    if (lines.length > S.MAX_PARTICIPANTS) {
      els.rosterHint.textContent = 'Capped at ' + S.MAX_PARTICIPANTS +
        ' — the rest are ignored. Past that it stops being a wheel.';
    } else if (count) {
      els.rosterHint.textContent = count + (count === 1 ? ' participant' : ' participants') +
        ' · saved in the link above';
    } else {
      els.rosterHint.textContent = 'Paste a list, one name per line.';
    }
  }

  function renderPresence() {
    els.presence.textContent = '';
    if (!state.board.participants.length) {
      var empty = doc.createElement('p');
      empty.className = 'empty';
      empty.textContent = 'Nobody on the wheel yet.';
      els.presence.appendChild(empty);
      return;
    }

    state.board.participants.forEach(function (name) {
      var isAway = state.away.indexOf(name) !== -1;
      var label = doc.createElement('label');
      label.setAttribute('data-name', name);
      if (isAway) label.className = 'away';

      var box = doc.createElement('input');
      box.type = 'checkbox';
      box.checked = !isAway;
      box.addEventListener('change', function () {
        setPresence(name, box.checked);
      });

      var text = doc.createElement('span');
      text.textContent = name;

      label.appendChild(box);
      label.appendChild(text);
      els.presence.appendChild(label);
    });
  }

  function setPresence(name, present) {
    var index = state.away.indexOf(name);
    if (present && index !== -1) state.away.splice(index, 1);
    if (!present && index === -1) state.away.push(name);
    syncPresence();
    rebuildWheel();
    render();
  }

  /* Updated in place rather than rebuilt: replacing the rows would throw
   * away keyboard focus on every single toggle. */
  function syncPresence() {
    var labels = els.presence.querySelectorAll('label');
    for (var i = 0; i < labels.length; i++) {
      var name = labels[i].getAttribute('data-name');
      var isAway = state.away.indexOf(name) !== -1;
      labels[i].classList.toggle('away', isAway);
      var box = labels[i].querySelector('input');
      if (box.checked === isAway) box.checked = !isAway;
    }
  }

  function renderThemes() {
    if (els.themes.childElementCount) {
      updateThemeSelection();
      return;
    }
    S.themeNames().forEach(function (name) {
      var palette = S.theme(name);
      var button = doc.createElement('button');
      button.type = 'button';
      button.className = 'theme-swatch';
      button.setAttribute('role', 'radio');
      button.setAttribute('data-theme', name);

      var dots = doc.createElement('span');
      dots.className = 'swatch-dots';
      palette.wedges.slice(0, 4).forEach(function (colour) {
        var dot = doc.createElement('i');
        dot.style.background = colour;
        dots.appendChild(dot);
      });

      var label = doc.createElement('span');
      label.textContent = palette.label;

      button.appendChild(dots);
      button.appendChild(label);
      button.addEventListener('click', function () { setTheme(name); });
      els.themes.appendChild(button);
    });
    updateThemeSelection();
  }

  function updateThemeSelection() {
    var swatches = els.themes.querySelectorAll('.theme-swatch');
    for (var i = 0; i < swatches.length; i++) {
      var isCurrent = swatches[i].getAttribute('data-theme') === state.board.theme;
      swatches[i].setAttribute('aria-checked', isCurrent ? 'true' : 'false');
      swatches[i].tabIndex = isCurrent ? 0 : -1;
    }
  }

  function setTheme(name) {
    state.board.theme = name;
    syncUrl();
    applyTheme();
    updateThemeSelection();
    /* Wedge colours are drawn from the palette, so the wheel is rebuilt. */
    rebuildWheel();
    render();
  }

  function applyBackground(value) {
    var trimmed = String(value || '').trim();
    var safe = S.safeImageUrl(trimmed);
    var invalid = trimmed.length > 0 && !safe;

    els.background.classList.toggle('invalid', invalid);
    els.backgroundHint.textContent = invalid
      ? 'Needs to be a full http:// or https:// image address.'
      : 'Optional. Anything the wheel sits on gets dimmed so names stay readable.';

    if (invalid) return;
    state.board.background = safe;
    syncUrl();
    applyTheme();
  }

  function renderSetup() {
    renderThemes();
    if (doc.activeElement !== els.background) {
      els.background.value = state.board.background;
    }
    if (doc.activeElement !== els.roster) {
      els.roster.value = state.board.participants.join('\n');
    }
    if (doc.activeElement !== els.turnLength) {
      els.turnLength.value = state.board.turnSeconds;
    }
    renderSetupWarnings(els.roster.value);
    renderPresence();
  }

  function openSetup() {
    state.setupOpen = true;
    els.setupScrim.hidden = false;
    els.setup.setAttribute('aria-hidden', 'false');
    els.setupToggle.setAttribute('aria-expanded', 'true');
    renderSetup();
    render();
    els.roster.focus();
  }

  function closeSetup() {
    state.setupOpen = false;
    els.setupScrim.hidden = true;
    els.setup.setAttribute('aria-hidden', 'true');
    els.setupToggle.setAttribute('aria-expanded', 'false');
    render();
    els.setupToggle.focus();
  }

  /* ---------------------------------------------------------------- toast */
  var toastTimer = null;

  /* Clicking a wedge is the fast path for marking someone away, so it needs
   * insurance against a misclick during a live standup. */
  function showToast(message, undo) {
    global.clearTimeout(toastTimer);
    els.toastText.textContent = message;
    els.toast.hidden = false;
    els.toastUndo.onclick = function () {
      hideToast();
      undo();
    };
    toastTimer = global.setTimeout(hideToast, 5000);
  }

  function hideToast() {
    global.clearTimeout(toastTimer);
    els.toast.hidden = true;
    els.toastUndo.onclick = null;
  }

  function handleWheelClick(event) {
    if (state.busy || state.setupOpen) return;
    var rect = els.canvas.getBoundingClientRect();
    var wedge = wheel.wedgeAt(event.clientX - rect.left, event.clientY - rect.top);
    if (!wedge) return;

    var name = wedge.name;
    setPresence(name, false);
    announce(name + ' marked away.');
    showToast(name + ' is away today', function () {
      setPresence(name, true);
      announce(name + ' is back on the wheel.');
    });
  }

  /* ----------------------------------------------------------- the round */
  function recordTurn() {
    if (!state.speaker) return;
    state.turns.push({
      name: state.speaker,
      seconds: timer.everStarted ? elapsedSeconds() : null,
      overtime: timer.everStarted && remainingSeconds() < 0
    });
  }

  function advance() {
    if (state.busy) return;
    sound.unlock();

    /* Whatever just happened on screen, the turn that was running is over. */
    recordTurn();
    resetTimer();

    var pool = S.eligible(state.board.participants, state.spoken, state.away);
    if (!pool.length) {
      if (state.speaker) { finishRound(); }
      return;
    }

    if (state.roundStartedAt === null) state.roundStartedAt = Date.now();
    state.busy = true;
    state.phase = state.speaker ? 'speaking' : 'idle';
    render();

    /* The previous speaker's dimmed wedge is swept away as this spin starts. */
    wheel.sweep(function (w) { return w.spoken; }, function () {
      var winner = S.pickWinner(pool);
      var index = wheel.wedges.map(function (w) { return w.name; }).indexOf(winner);
      if (index === -1) { state.busy = false; render(); return; }
      wheel.spin(index, {
        onTick: function (remaining) { sound.tick(remaining); },
        onDone: function () { land(winner); }
      });
    });
  }

  function land(winner) {
    state.speaker = winner;
    if (state.spoken.indexOf(winner) === -1) state.spoken.push(winner);
    state.busy = false;
    state.phase = 'speaking';
    wheel.wedges.forEach(function (w) { w.spoken = w.name === winner; });
    wheel.draw();
    if (state.pendingRebuild) rebuildWheel();
    render();
    sound.land();
    announce(winner + ' is up. ' + S.formatClock(state.board.turnSeconds) + ' on the clock.');
  }

  function finishRound() {
    sound.finish();
    state.phase = 'complete';
    state.speaker = null;
    render();
    renderEndCard();
    doc.title = BASE_TITLE;
    announce('Standup finished.');
  }

  function renderEndCard() {
    var total = state.roundStartedAt ? (Date.now() - state.roundStartedAt) / 1000 : 0;
    var over = state.turns.filter(function (t) { return t.overtime; }).length;

    els.endTitle.textContent = S.formatClock(total) + ' all in';
    els.endSub.textContent = state.turns.length + (state.turns.length === 1 ? ' turn' : ' turns') +
      (over ? ' · ' + over + ' went over' : ' · nobody went over');

    els.order.textContent = '';
    state.turns.forEach(function (turn) {
      var li = doc.createElement('li');
      if (turn.overtime) li.className = 'over';
      if (turn.seconds === null) li.className = 'untimed';

      var who = doc.createElement('span');
      who.className = 'who';
      who.textContent = turn.name;

      var took = doc.createElement('span');
      took.className = 'took';
      took.textContent = turn.seconds === null ? 'not timed' : S.formatClock(turn.seconds);

      li.appendChild(who);
      li.appendChild(took);
      els.order.appendChild(li);
    });
  }

  function newRound() {
    hideToast();
    state.spoken = [];
    state.turns = [];
    state.speaker = null;
    state.roundStartedAt = null;
    state.phase = 'idle';
    resetTimer();
    wheel.setWedges(wedgesFromState());
    render();
    els.spinBtn.focus();
  }

  function copyBoardLink(button) {
    var restore = function () { button.textContent = 'Copy board link'; };
    var report = function (message) {
      button.textContent = message;
      global.setTimeout(restore, 1600);
    };
    if (global.navigator.clipboard && global.navigator.clipboard.writeText) {
      global.navigator.clipboard.writeText(global.location.href).then(
        function () { report('Copied'); },
        function () { report('Copy failed'); }
      );
    } else {
      report('Copy failed');
    }
  }

  function renderMuteButton() {
    els.muteToggle.setAttribute('aria-pressed', sound.muted ? 'true' : 'false');
    els.muteToggle.setAttribute('aria-label', sound.muted ? 'Unmute sound' : 'Mute sound');
    els.muteToggle.title = sound.muted ? 'Unmute sound' : 'Mute sound';
    /* Struck through with CSS rather than a combining character, which
       renders unpredictably across platforms. */
  }

  /* ----------------------------------------------------------------- wire */
  els.spinBtn.addEventListener('click', advance);

  els.muteToggle.addEventListener('click', function () {
    sound.setMuted(!sound.muted);
    renderMuteButton();
    if (!sound.muted) { sound.unlock(); sound.tick(0.5); }
  });

  els.themes.addEventListener('keydown', function (event) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    var names = S.themeNames();
    var at = names.indexOf(state.board.theme);
    var next = event.key === 'ArrowRight' ? at + 1 : at - 1;
    next = (next + names.length) % names.length;
    event.preventDefault();
    setTheme(names[next]);
    els.themes.querySelector('[aria-checked="true"]').focus();
  });

  els.background.addEventListener('input', function () { applyBackground(els.background.value); });
  els.timerToggle.addEventListener('click', function () {
    timer.running ? pauseTimer() : startTimer();
  });
  els.timerReset.addEventListener('click', resetTimer);
  els.newRound.addEventListener('click', newRound);
  els.copyLink.addEventListener('click', function () { copyBoardLink(els.copyLink); });
  els.copyLinkSetup.addEventListener('click', function () { copyBoardLink(els.copyLinkSetup); });

  els.setupToggle.addEventListener('click', function () {
    state.setupOpen ? closeSetup() : openSetup();
  });
  els.setupClose.addEventListener('click', closeSetup);
  els.setupScrim.addEventListener('click', closeSetup);

  els.roster.addEventListener('input', function () { applyRoster(els.roster.value); });

  els.turnLength.addEventListener('input', function () {
    var seconds = parseInt(els.turnLength.value, 10);
    if (!isFinite(seconds) || seconds < 15 || seconds > 3600) return;
    state.board.turnSeconds = seconds;
    syncUrl();
    if (!timer.everStarted) tickTimer();
  });

  els.turnLength.addEventListener('change', function () {
    els.turnLength.value = state.board.turnSeconds;
  });

  els.canvas.addEventListener('click', handleWheelClick);

  doc.addEventListener('keydown', function (event) {
    /* Escape is handled first and unconditionally: it is the way out of the
       panel, and the panel puts the cursor straight into the textarea. */
    if (event.key === 'Escape') {
      event.preventDefault();
      state.setupOpen ? closeSetup() : openSetup();
      return;
    }

    var tag = doc.activeElement && doc.activeElement.tagName;
    if (tag === 'TEXTAREA' || tag === 'INPUT') return;
    if (state.setupOpen) return;

    if (event.key === ' ' || event.code === 'Space') {
      event.preventDefault();
      if (!els.spinBtn.disabled) advance();
      return;
    }
    if ((event.key === 's' || event.key === 'S') && state.phase === 'speaking') {
      event.preventDefault();
      timer.running ? pauseTimer() : startTimer();
    }
  });

  if (global.ResizeObserver) {
    new global.ResizeObserver(function () { wheel.resize(); }).observe(els.wrap);
  } else {
    global.addEventListener('resize', function () { wheel.resize(); });
  }

  applyTheme();
  wheel.setWedges(wedgesFromState());
  wheel.resize();
  resetTimer();
  renderSetup();
  renderMuteButton();
  render();

  /* First visit: nothing to spin, so the panel is the screen. */
  if (!state.board.participants.length) openSetup();
})(typeof window !== 'undefined' ? window : globalThis);
