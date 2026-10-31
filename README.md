<h1 align="center">Upside Down</h1>
<p align="center">All Hallows’ Eve.</p>
<p align="center"><strong>English</strong> · <a href="README.zh-CN.md">简体中文</a></p>
<p align="center"><img src="docs/preview.webp" width="420" alt="A suspended house, a ghost at its doorway, and a duck on reflecting water"></p>

A suspended house above still water. A ghost watches a small yellow duck from its doorway; their reflections meet below. By **@EuanTop**.

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
- Real planar reflections with restrained, periodic GLSL distortion and historical swimming wakes.
- A continuous cloth ghost with head tracking, swaying and blinking; a procedural swimming duck.
- The duck, cloth construction, lighting methods and original synthesized score are adapted from the preceding series artwork. The spatial composition is rebuilt here.
- Local fonts and procedural geometry. The active scene modules are in `src/inverted/`; earlier studies remain in the source tree.

```sh
npm run build
npm test
```

Tests include gallery winding, water clearance, swimmer setup and loop continuity. Media, browser profiles and generated output stay in ignored `artifacts/`. Local previews do not publish or upload anything.

Code: [MIT](LICENSE). Goudy Bookletter 1911: [SIL OFL](public/fonts/OFL.txt).
