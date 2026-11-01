<h1 align="center">Leap of Faith</h1>
<p align="center">All Hallows’ Eve.</p>
<p align="center"><strong>English</strong> · <a href="README.zh-CN.md">简体中文</a></p>
<p align="center"><img src="docs/preview.webp" width="420" alt="A suspended house, a ghost at its doorway, and a duck on reflecting water"></p>

Two suspended worlds meet at the water. A duck and a swan cross between night and daylight; the resident ghosts blink and gently follow the swimmers. By **@EuanTop**.

This branch explores independently moving castle modules and flowing colour exchanges. The full world-turn version is preserved at Git tag `world-flip-v1`.

Video export produces a high-quality 4K HEVC/AAC MP4 directly, without generating a lossless master.

### Run

Requires Node 22.12+.

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:5175/`. The collapsible panel shares its parameters with the [local control API](docs/control.md). Default frame: **3:4**. Scene duration: **28.8 seconds**. Music requires a playback gesture.

### Implementation

- Parametric hanging towers, recessed archways, curved galleries and pumpkin pendants.
- Black–violet–gold fields travel through curved material paths. Lettering and its contrast halo continuously change between pale yellow and deep violet with the local background.
- Corresponding tower rooms and galleries exchange their positions above and below the water along separate spatial paths. Each module reorients locally, carrying its resident and lantern, without rolling the whole scene.
- Both worlds use permanent 3D geometry. Water-plane clipping separates the upper and lower views; only submerged geometry receives wave distortion. The gallery and three spires have their own motion.
- The swimmers leap first, briefly lingering at the apex; the rooms follow on staggered, eased paths. Residents react after their room starts and catch up with a short delay, retaining their simple cloth form.
- The duck, cloth construction and lighting methods are adapted from the preceding series artwork. The space and score are rebuilt here.
- A new 50 BPM, unpulsed ambient score: long harmony, centred low roots, orbiting common tones and pitched duck/swan duets that exchange melody and harmony roles without changing tempo. Circular stereo reverberation preserves the loop.
- Surface trails retain fixed world coordinates through the exchange; short entry and emergence rings stay at their original contact points.
- Optional Prism Print, Velvet Film and Violet Etching finishing passes, with adjustable strength and an Original comparison. No full-screen blur.
- Local fonts, procedural geometry and the authored swan GLB from the series’ Crescent Lake artwork. The active scene modules are in `src/inverted/`; earlier studies remain in the source tree.

```sh
npm run build
npm test
```

Tests include gallery winding, water clearance, swimmer setup and loop continuity. Media, browser profiles and generated output stay in ignored `artifacts/`. Local previews do not publish or upload anything.

Code: [MIT](LICENSE). Goudy Bookletter 1911: [SIL OFL](public/fonts/OFL.txt).
