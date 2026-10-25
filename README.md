# Senes Game

A simple touch game for babies and toddlers. Colourful shapes drift in from the sides of the screen. Touch a shape once and it zooms around; touch it again and it pops.

There are no menus: the game starts the moment it opens. Grown-ups set it up on a separate settings page.

**▶ Play:** https://piwe.github.io/SenesGame/
**⚙ Settings:** https://piwe.github.io/SenesGame/settings.html
**Source:** https://github.com/Piwe/SenesGame

## How to play

- Shapes enter slowly from the left and right and move around without bumping into each other.
- **First touch:** the shape pulses, gets a white outline, spins, and moves three times faster.
- **Second touch:** the shape pops into a burst of dots with a little sound, and a new one comes in.
- Touch areas are larger than the shapes, so imprecise little taps still count.
- Works with touch, mouse or pen.

## Settings

Open `settings.html` directly, or hold the **top-left corner of the game for 3 seconds**. Changes save as you make them; tap **Play** to start the game.

| Setting | What it does | Default |
|---|---|---|
| Shapes | Tick the shapes to include: circles, squares, triangles, diamonds, stars, pyramids. At least one must stay ticked. | All |
| Shape size | Diameter in centimetres (4–16 cm) | 8 cm, about the length of a 10-month-old's hand |
| Shape speed | How fast shapes drift before being touched | Slow |
| Shapes on screen | Maximum number of shapes at once (1–20) | 5 |
| Sound | Soft tones on touch and pop | On |
| Screen calibration | Match the on-screen bar to a bank card's short edge (5.4 cm) so centimetres are real centimetres | Estimated |

The page includes a live preview of a shape at the chosen size and speed. **Defaults** resets everything except the calibration.

## Install on a tablet

The game is a Progressive Web App: install it once and it runs full-screen and offline.

- **Android (Chrome):** open the play link → ⋮ menu → **Install app**. Long-pressing the app icon offers a **Settings** shortcut.
- **iPad / iPhone (Safari):** open the play link → Share → **Add to Home Screen**.

After installing, do the screen calibration inside the installed app (on iPad the home-screen app keeps its own settings, separate from Safari).

For a toddler-proof setup, also turn on **Guided Access** (iPad) or **Screen Pinning** (Android) so the game can't be left by accident.

## Play on a laptop without installing

Download or clone the repo and double-click `index.html`. No server, Node or internet connection is needed.

```sh
git clone https://github.com/Piwe/SenesGame.git
```

## Project structure

| File | Purpose |
|---|---|
| `index.html` | The game page: a full-screen canvas |
| `game.js` | Game loop, spawning, collision avoidance, touch handling, pop effects and sound |
| `shapes.js` | Shape drawing and colour palette, shared by the game and the settings page |
| `config.js` | Settings defaults, limits and validation; saves to `localStorage` |
| `settings.html` / `settings.js` | The settings page with shape picker, sliders, preview and calibration |
| `manifest.webmanifest` | App name, icons and full-screen display for installing |
| `sw.js` | Service worker: fetches fresh files when online, serves cached copies offline |
| `pwa.js` | Registers the service worker (only over http/https) |
| `icons/` | App icons and favicon; `icon.svg` is the source artwork |

## Technical notes

- **Plain JavaScript, no build step.** HTML5 Canvas, Pointer Events and Web Audio, with no frameworks or npm packages.
- **Classic `<script>` tags, not ES modules**, because modules don't load from `file://`.
- **Settings travel between pages in the URL hash** (e.g. `index.html#speed=40&shapes=star%2Cpyramid`) as well as `localStorage`, because some browsers keep separate storage for each local file.
- **Every shape fits within a circle of its radius**, so collisions and touch detection treat all shapes as circles.
- **The service worker only registers over http(s)**, so opening the files from disk stays quick and error-free.

## Hosting and updates

The site is served by **GitHub Pages** from the root of the `main` branch:

- Live site: https://piwe.github.io/SenesGame/
- Repository: https://github.com/Piwe/SenesGame

Every push to `main` redeploys the site within about a minute. Installed copies pick up the changes the next time they open with an internet connection. To try changes locally, open `index.html` from disk, or serve the folder (for example `python3 -m http.server`) and visit `http://localhost:8000` to test the installable app features.
