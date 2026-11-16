# Sounds

The game's music and sound effects are written here as notes and rendered: the music on synthesizers and drum machines, the effects with recorded instruments. The results are committed in `src/assets/audio/`, with the sprite index in `src/lib/fx/sfx-sprite.json`, so building the game needs none of this.

- `songs.py`: the three music loops, each 32 bars and built on one shared theme: menu (synthwave, F major, 100 BPM), play (calm electronic, D major, 90 BPM), and Blitz (electro house, A minor, 128 BPM).
- `effects.py`: every sound effect, packed into one sprite file.
- `instruments.py`: the recorded instruments the effects use.
- `render.py`: renders and exports them.

## Rendering

You need Python 3 with numpy, scipy, soundfile, and [pedalboard](https://github.com/spotify/pedalboard); ffmpeg; the [Surge XT](https://surge-synthesizer.github.io/) VST3 plugin; the sample libraries below; and `musickit`, a small rendering toolkit kept outside this repository, on `PYTHONPATH`.

```sh
PYTHONPATH=path/to/musickit:scripts/sounds python scripts/sounds/render.py          # both
PYTHONPATH=path/to/musickit:scripts/sounds python scripts/sounds/render.py sfx      # effects only
PYTHONPATH=path/to/musickit:scripts/sounds python scripts/sounds/render.py blitz    # one loop (menu, play, or blitz)
```

Each run prints how loud every part is, any notes a semitone apart that sound together, and each effect's loudness. Music is mastered to -20 LUFS. Effects are matched by how loud they are on a phone speaker, with peaks at or below -2 dBFS. Files are exported as Ogg Opus, with AAC (`.m4a`) for browsers that can't decode Opus.

## Credits

The music's synthesizers and drum machines are part of the rendering toolkit. The effects use recorded instruments:

- [Versilian Community Sample Library](https://github.com/sgossner/VCSL) (VCSL), CC0: marimba, vibraphone, glockenspiel, hand chimes, concert harp, mark trees, and shaker.
- [Versilian Studios Chamber Orchestra 2, Community Edition](https://github.com/sgossner/VSCO-2-CE) (VSCO 2 CE), CC0: violin and contrabass pizzicato.
- [Surge XT](https://surge-synthesizer.github.io/) (GPL-3.0) plays the electric piano in the play loop. It is used only to render the audio and isn't part of the game.
