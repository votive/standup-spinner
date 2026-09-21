# The wheel is drawn on canvas, scaled to devicePixelRatio

The wheel is a single `<canvas>` redrawn each frame, sized to `devicePixelRatio` so it stays sharp on retina laptops and meeting-room displays.

Inline SVG was the obvious alternative and was rejected: a wheel of a dozen wedges with curved labels is hundreds of DOM nodes that the browser re-rasterises on every frame of a four-second spin, and curved text along an arc is far more awkward to control. The custom background image is a CSS layer behind the canvas, so it never participates in the spin.
