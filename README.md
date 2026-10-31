<h1 align="center">Upside Down</h1>
<p align="center">All Hallows’ Eve.</p>
<p align="center"><strong>English</strong> · <a href="README.zh-CN.md">简体中文</a></p>
<p align="center"><img src="docs/preview.webp" width="420" alt="A suspended house, a ghost at its doorway, and a duck on reflecting water"></p>

Two suspended worlds meet at the water. A duck and a swan cross between night and daylight; the resident ghosts lean out and respond to the turning architecture. By **@EuanTop**.

This is a visual development build. The current scene has not been exported as a finished film.

### Run

Requires Node 22.12+.

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:5175/`. The collapsible panel shares its parameters with the [local control API](docs/control.md). Default frame: **3:4**. Scene duration: **28.8 seconds**. Music requires a playback gesture.

### Implementation

- Parametric hanging towers, recessed archways, curved galleries and pumpkin pendants.
- A continuous black–violet–gold field changes direction after the spatial turn, without a separate horizon.
- Both worlds use permanent 3D geometry. Water-plane clipping separates the upper and lower views; only submerged geometry receives wave distortion. The gallery and three spires have their own motion.
- Cloth residents anticipate the exchange, counter-lean during rotation and settle with delayed responses. Duck and swan shoulder hinges drive distinct wing gestures; continuous forward arcs carry both through the water.
- The duck, cloth construction and lighting methods are adapted from the preceding series artwork. The space and score are rebuilt here.
- A new 50 BPM, unpulsed ambient score: long harmony, centred low roots, orbiting common tones and pitched duck/swan duets that exchange melody and harmony roles without changing tempo. Circular stereo reverberation preserves the loop.
- Local fonts, procedural geometry and the authored swan GLB from the series’ Crescent Lake artwork. The active scene modules are in `src/inverted/`; earlier studies remain in the source tree.

```sh
npm run build
npm test
```

Tests include gallery winding, water clearance, swimmer setup and loop continuity. Media, browser profiles and generated output stay in ignored `artifacts/`. Local previews do not publish or upload anything.

Code: [MIT](LICENSE). Goudy Bookletter 1911: [SIL OFL](public/fonts/OFL.txt).
