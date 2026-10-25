"""Renders the game's music and sound effects into src/assets/audio.

Needs the music toolkit on PYTHONPATH (musickit), Surge XT, and the CC0
sample libraries; see scripts/sounds/README.md. Usage:

    python scripts/sounds/render.py [music | menu | play | blitz] [sfx]
"""

import sys
from pathlib import Path

import musickit as mk

OUT = Path(__file__).resolve().parents[2] / "src/assets/audio"
MUSIC_LUFS = -20.0


SONGS = ("menu", "play", "blitz")


def music(names=SONGS):
    import songs

    for name in names:
        make = {"menu": songs.home, "play": songs.play, "blitz": songs.blitz}[name]
        song = make()
        for row in song.balance(song.length_bars):
            print(f"  {row[0]:<10} {row[1]:6.1f} LUFS alone  {row[2] * 100:5.1f}% of energy")
        for c in song.clashes():
            print("  clash", c)
        x = song.render(bars=song.length_bars, tail=5, master=songs.master())
        x, gain, peak = mk.normalize(x, MUSIC_LUFS)
        print(mk.report(name, x))
        mk.write_wav(x, f"/tmp/balls-{name}.wav")
        mk.export(x, OUT / f"music-{name}", bitrate="64k")


def sfx():
    import effects

    effects.render_all(OUT)


if __name__ == "__main__":
    which = sys.argv[1:] or ["music", "sfx"]
    OUT.mkdir(parents=True, exist_ok=True)
    for w in which:
        if w in SONGS:
            music([w])
        else:
            {"music": music, "sfx": sfx}[w]()
