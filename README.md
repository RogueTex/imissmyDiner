# I Miss My Diner

A cozy ambient soundscape mixer that recreates the atmosphere of a classic American breakfast diner.

## Run locally

```bash
python3 -m http.server 4173
```

Then open [http://localhost:4173](http://localhost:4173).

## Features

- Retro Americana single-page UI with animated diner hero scene
- 8 independent ambience channels with per-channel volume control
- Master volume control with real-time gain updates
- Play/Pause all channels with OPEN/CLOSED diner sign state
- 3 preset moods: Early Bird, Sunday Rush, Rainy Tuesday
- Persistent settings in `localStorage`
- Mobile + desktop responsive layout

## Stack

- Plain HTML/CSS/JavaScript
- Web Audio API
