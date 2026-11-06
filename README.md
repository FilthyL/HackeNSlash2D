# ASHEN VOW

**Chapter I: The Bell That Would Not Mourn**

A small, cinematic isometric action chapter. Play Ren Takamori, a Japanese samurai returning to confront his former commander, Lord Kuroda—the Hollow Warden—in a storm-lashed shrine courtyard.

Chapter I uses a black-and-white storm palette. Ren wears a woven kasa, a windblown kimono jacket, and black hakama. Layered rain, swaying trees, ground ripples, lightning, and synthesized wind and thunder establish the atmosphere. Sound remains opt-in, and reduced-motion mode removes lightning and tree sway.

The chapter opens with The Men at the Gate: two oathbound former comrades, a swordsman and a spearman. Defeat them, choose a remembrance, and continue to the boss duel. The chapter includes opening cutscenes, a boss reveal, a second-phase transition, defeat and retry, and a story ending. Combat centres on reading attacks, chaining sword cuts, timed parries, dodging, and committed heavy strikes. Perfect parries earn up to three Resolve charges; Q spends one on Stillness Cut, an invulnerable draw-and-dash strike. Remembrances grant either 120 maximum health or a starting Resolve charge for the duel. Choosing one saves a boss checkpoint in this browser; the title screen then offers Resume at the Bell. Duel Kuroda remains available for immediate boss practice before a checkpoint is saved.

Other protagonists have written story treatments; Ren is the only playable character.

## Run locally

Use Node.js 22.12+ and npm.

```sh
npm ci
npm run dev
```

Vite serves the game on port 5173 when available. Open the address printed by Vite.

```sh
npm test       # Combat simulation tests
npm run build # TypeScript checks and production build
npm run preview
# With the preview running on port 4173:
npm run test:encounter # Direct boss duel, ending, defeat and retry
npm run test:chapter   # Full chapter, both remembrances and saved checkpoint
```

The browser smoke test expects a running development server at `http://127.0.0.1:5173`. It uses system Chromium at `/usr/bin/chromium` when available, or Playwright’s installed Chromium. Override these with `TEST_URL` and `CHROMIUM_PATH`:

```sh
mkdir -p artifacts
npm run test:browser
```

It exercises desktop interaction and mobile viewport behaviour, and saves screenshots under `artifacts/`. Mobile emulation is not a substitute for physical-device testing. Safari, Firefox, Edge, and actual mobile devices still need compatibility and performance validation.

## Controls

| Action | Input |
| --- | --- |
| Move | WASD / arrow keys |
| Sword cut | J / left click on the arena |
| Parry | K / right click on the arena |
| Dodge | Space |
| Heavy cut | E |
| Stillness Cut | Q / ability button; costs one Resolve |
| Pause / resume | Escape |
| Skip cutscene | Enter / on-screen skip button |

Touch controls appear on touch devices. Enable sound with the sound button; audio starts muted. Reduced-motion preferences limit effects. Watch the ground warnings, attack during recovery, and dodge through the bell wave—it cannot be parried.

## Implementation

TypeScript, native Canvas 2D, and Vite. There is no runtime game framework or backend. The arena and characters are original procedural illustrations; sound is synthesised with Web Audio. Cutscenes use the same renderer as gameplay, with no video downloads or voice assets.

| File | Responsibility |
| --- | --- |
| `src/combat.ts` | Combat simulation, attacks, damage, stamina, and boss phases |
| `src/renderer.ts` | Isometric scenery, characters, weather, and effects |
| `src/main.ts` | Input, interface, cutscene sequencing, and game state |
| `src/audio.ts` | Synthesised soundscape and combat cues |
| `src/style.css` | Menus, HUD, responsive layout, and touch controls |

`npm run build` produces a static `dist/` directory for deployment to a static host such as GitHub Pages, Cloudflare Pages, or Netlify. Relative asset paths support hosting under a subdirectory. No credentials or server services are required.

## Story and scope

- [Story bible](docs/STORY_BIBLE.md): world, Ren, English knight Eleanor Vale, Chinese swordswoman Lin Yue, and Kerala-informed warrior Meera.
- [First-boss screenplay and roadmap](docs/FIRST_BOSS.md): cinematic intentions, encounter structure, and staged expansion.

This is one playable chapter with a two-sentry encounter and a two-phase boss, not a full campaign. The documents include future narrative and visual targets that exceed the current implementation. Character animation, balance, accessibility, mobile controls, and performance should continue to be tested and refined before release.

## Trial deployment

The GitHub Actions workflow in `.github/workflows/deploy.yml` tests, builds, and deploys every push to `main`. In repository **Settings → Pages → Build and deployment**, select **GitHub Actions**. If the first workflow ran before Pages was enabled, rerun **Deploy Ashen Vow** from the Actions tab.

The expected address is `https://filthyl.github.io/HackeNSlash2D/` once GitHub reports a successful Pages deployment. Enabling Pages is a repository setting; committing this workflow alone does not activate hosting.
