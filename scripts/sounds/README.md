# Sounds

The game's music and sound effects are written here as notes and rendered with recorded instruments. The results are committed in `src/assets/audio/`, with the sprite index in `src/lib/fx/sfx-sprite.json`, so building the game needs none of this.

- `songs.py`: the two music loops, menu (F major, 96 BPM) and play (D major, 78 BPM), each 32 bars.
- `effects.py`: every sound effect, packed into one sprite file.
- `instruments.py`: the instruments both use.
- `render.py`: renders and exports them.

## Rendering

You need Python 3 with numpy, scipy, soundfile, and [pedalboard](https://github.com/spotify/pedalboard); ffmpeg; the [Surge XT](https://surge-synthesizer.github.io/) VST3 plugin; the sample libraries below; and `musickit`, a small rendering toolkit kept outside this repository, on `PYTHONPATH`.

```sh
PYTHONPATH=path/to/musickit:scripts/sounds python scripts/sounds/render.py          # both
PYTHONPATH=path/to/musickit:scripts/sounds python scripts/sounds/render.py sfx      # effects only
```

Each run prints how loud every part is, any notes a semitone apart that sound together, and each effect's loudness. Music is mastered to -20 LUFS. Effects are matched by how loud they are on a phone speaker, with peaks at or below -2 dBFS. Files are exported as Ogg Opus, with AAC (`.m4a`) for browsers that can't decode Opus.

## Credits

- [Versilian Community Sample Library](https://github.com/sgossner/VCSL) (VCSL), CC0: marimba, vibraphone, glockenspiel, hand chimes, kalimba, concert harp, upright piano, and percussion.
- [Versilian Studios Chamber Orchestra 2, Community Edition](https://github.com/sgossner/VSCO-2-CE) (VSCO 2 CE), CC0: violin and contrabass pizzicato, and flute.
- [Surge XT](https://surge-synthesizer.github.io/) (GPL-3.0) plays the two pads. It is used only to render the audio and isn't part of the game.
