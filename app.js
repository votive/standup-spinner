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
      wedges: ['#ff2d95', '#00e5ff', '#7b2dff', '#00ffa3', '#ff6b35', '#c026d3'],
      bg: 'radial-gradient(ellipse at 50% 0%, #1e1035 0%, #0b0618 60%, #05030d 100%)',
      accent: '#00e5ff',
      rim: '#ff2d95',
      text: '#f0eaff'
    },
    sunrise: {
      label: 'Sunrise',
      wedges: ['#ff7043', '#ffb300', '#ef5350', '#ffd54f', '#ff8a65', '#f4511e'],
      bg: 'radial-gradient(ellipse at 50% 0%, #fff3e0 0%, #ffe0b2 55%, #ffccbc 100%)',
      accent: '#e64a19',
      rim: '#ffffff',
      text: '#3e2723'
    },
    forest: {
      label: 'Forest',
      wedges: ['#2e7d32', '#8d6e63', '#1b5e20', '#a1887f', '#43a047', '#6d4c41'],
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
      wedges: ['#ff8fab', '#8ecae6', '#ffd670', '#b5e48c', '#cdb4db', '#ffafcc'],
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

  /* Label colour chosen per wedge by luminance, so text clears contrast on
   * every palette rather than assuming one fixed ink colour works. */
  function inkFor(hex) {
    return relativeLuminance(hex) > 0.42 ? '#161016' : '#ffffff';
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

  Wheel.prototype.totalWeight = function () {
    return this.wedges.reduce(function (sum, w) { return sum + w.weight; }, 0);
  };

  Wheel.prototype.draw = function () {
    var ctx = this.ctx;
    var size = this.size;
    if (!size) return;

    var cx = this.width / 2, cy = this.height / 2;
    var rimWidth = Math.max(8, size * 0.046);
    /* The marker overhangs the rim, so the wheel is inset to leave room for
       it rather than letting it clip against the canvas edge. */
    var outer = size / 2 - 2 - size * POINTER_OVERHANG;
    var radius = outer - rimWidth;
    var palette = this.palette;

    ctx.clearRect(0, 0, this.width, this.height);

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

/* ==================================================================== BOOT
 * Only runs when the app page is present; tests.html loads this file without
 * an #app element and gets the logic alone.
 */
(function (global) {
  'use strict';
  var doc = global.document;
  if (!doc || !doc.getElementById('app')) return;

  var S = global.Spinner;
  var els = {
    app: doc.getElementById('app'),
    canvas: doc.getElementById('wheel'),
    wrap: doc.querySelector('.wheel-wrap'),
    spinBtn: doc.getElementById('spinBtn'),
    hubLabel: doc.querySelector('.hub-label'),
    caption: doc.getElementById('caption'),
    bgImage: doc.getElementById('bgImage'),
    announcer: doc.getElementById('announcer')
  };

  var state = {
    board: S.parseBoard(global.location.search),
    spoken: [],
    away: [],
    speaker: null,
    busy: false
  };

  var wheel = new global.SpinnerWheel(els.canvas);

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
        colorIndex: state.board.participants.indexOf(name)
      };
    });
  }

  function rebuildWheel() {
    wheel.setWedges(wedgesFromState());
    render();
  }

  function render() {
    var status = S.rosterState(state.board.participants, state.spoken, state.away);
    var remaining = S.eligible(state.board.participants, state.spoken, state.away).length;

    els.spinBtn.disabled = state.busy || remaining === 0;
    els.hubLabel.textContent = state.speaker && remaining > 0 ? 'Next' : 'Spin';

    if (status === 'setup') {
      els.caption.textContent = 'Add participants to the URL to begin';
    } else if (status === 'all-away') {
      els.caption.textContent = "Everyone's away today";
    } else if (state.busy) {
      els.caption.textContent = '';
    } else if (state.speaker) {
      els.caption.textContent = remaining
        ? state.speaker + ' is up — ' + remaining + ' still to go'
        : state.speaker + ' is up — last one';
    } else {
      els.caption.textContent = remaining + ' on the wheel';
    }
  }

  function announce(message) {
    els.announcer.textContent = message;
  }

  /* ----------------------------------------------------------------- spin */
  function handleSpin() {
    if (state.busy) return;
    var pool = S.eligible(state.board.participants, state.spoken, state.away);
    if (!pool.length) return;

    state.busy = true;
    render();

    /* The previous speaker's dimmed wedge is swept away as this spin starts. */
    wheel.sweep(function (w) { return w.spoken; }, function () {
      var winner = S.pickWinner(pool);
      var index = wheel.wedges.map(function (w) { return w.name; }).indexOf(winner);
      if (index === -1) { state.busy = false; render(); return; }

      wheel.spin(index, {
        onDone: function () { land(winner); }
      });
    });
  }

  function land(winner) {
    state.speaker = winner;
    if (state.spoken.indexOf(winner) === -1) state.spoken.push(winner);
    state.busy = false;
    wheel.wedges.forEach(function (w) { w.spoken = w.name === winner; });
    wheel.draw();
    render();
    announce(winner + ' is up next.');
  }

  /* ----------------------------------------------------------------- wire */
  els.spinBtn.addEventListener('click', handleSpin);

  doc.addEventListener('keydown', function (event) {
    if (event.key === ' ' || event.code === 'Space') {
      if (doc.activeElement && doc.activeElement.tagName === 'TEXTAREA') return;
      event.preventDefault();
      if (!els.spinBtn.disabled) handleSpin();
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
  render();
})(typeof window !== 'undefined' ? window : globalThis);
