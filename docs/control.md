# Local control

The development service owns state and task lifecycle. The panel and scripts use the same commands. All writes require an `Origin` matching the loopback service. Host checks, bounded JSON requests, parameter limits and one active rendering task are enforced.

| Method | Path | Meaning |
| --- | --- | --- |
| GET | `/__art` | Identity, capabilities, renderer state |
| GET | `/__art/schema` | Parameter rules, defaults, profiles |
| GET | `/__art/diagnostics` | Scene counts, frame metrics and shader errors |
| GET | `/__art/state` | Revision, live clock, renderer acknowledgement |
| PATCH | `/__art/state` | `{expectedRevision,patch}`; atomic validation |
| POST | `/__art/capture` | `{revision,time,width,height,idempotencyKey,overrides?}` |
| POST | `/__art/exports` | `{revision,profile,idempotencyKey}` |
| GET | `/__art/jobs/{id}` | Status, stage, frames, errors, completed paths |
| POST | `/__art/jobs/{id}/cancel` | Cancel unfinished work; retain completed files |
| GET | `/__art/music/score` | Actual versioned note events |
| GET | `/__art/music/version` | Lightweight current score version; preview reloads changed audio |
| POST | `/__art/music/render` | Full mix only; optional score version; rejects ranges |
| GET | `/__art/audio` | Current synthesized WAV |

Music requests regenerate a missing or outdated score from the shared synthesis source. WAV responses bypass browser caches; preview URLs also contain the score version. `npm run music` publishes complete files and writes version metadata last. The current score uses four 6/4 phrases at 50 BPM: long overlapping harmony, unpulsed low roots and four pitched duck/swan duets. The scene and synthesis share the crossing clock in `src/inverted/exchange.mjs`; melodic and supporting roles exchange while tempo and the harmonic foundation remain continuous. All diffuse tails wrap in the circular PCM buffer.

An accepted revision does not mean it has been drawn. The live page reports `appliedRevision` and `frameTime` after drawing. Capture jobs render the requested snapshot and frame directly. Optional validated `overrides` apply only to that capture, for comparisons without changing the live preview. Uncertain task submissions can be retried with exactly the original payload and key; revision checks apply to new work after lookup of existing keys.

Exports freeze scene settings; another preview change does not alter them. Source edits are intentionally outside this guarantee: finish editing before starting a final render. Jobs have a 45-minute deadline; each renderer request is also bounded. A disconnected renderer returns an error, never a placeholder image. An export uses one frame at a time, creates both encodings in a temporary directory and validates them before replacing `latest/`.

The isolated rendering profile and all output live under ignored `artifacts/`. Each verified export has its own timestamped directory; `latest` is only a convenience link. Previous completed versions are retained for iteration reviews. A missing external `artifacts` target fails explicitly. Successful tasks return local paths; they do not publish or upload files.
