"""Renders the game's music and sound effects into src/assets/audio.

Needs the music toolkit on PYTHONPATH (musickit), Surge XT, and the CC0
sample libraries; see scripts/sounds/README.md. Usage:

    python scripts/sounds/render.py [music | menu | play | blitz] [sfx]
"""

import sys
from pathlib import Path

import numpy as np

import musickit as mk
from musickit import fx

OUT = Path(__file__).resolve().parents[2] / "src/assets/audio"
MUSIC_LUFS = -20.0


SONGS = ("menu", "play", "blitz")


def mix(loop):
    """The loop's music pumped by the kick, plus its drums, through the master bus."""
    m = loop.music.render(bars=loop.bars, tail=5)
    if loop.duck:
        m = fx.sidechain(m, loop.bpm, **loop.duck)
    x = m + loop.drums.render(bars=loop.bars, tail=5)
    body = x.shape[-1]
    # Master two copies and keep the second, so the compressor is settled at the seam.
    board = fx.master_chain(loop.style)
    return mk.to_stereo(board(np.concatenate([x, x], axis=-1).astype(np.float32), mk.SR, reset=True))[:, body:]


def music(names=SONGS):
    import songs

    for name in names:
        loop = getattr(songs, name)()
        for song in (loop.music, loop.drums):
            for row in song.balance(loop.bars):
                print(f"  {row[0]:<10} {row[1]:6.1f} LUFS alone  {row[2] * 100:5.1f}% of energy")
        for c in loop.music.clashes():
            print("  clash", c)
        print("  shape", loop.music.shape())
        x, gain, peak = mk.normalize(mix(loop), MUSIC_LUFS)
        mono = mk.lufs(np.tile(x.mean(0), (2, 1)))
        print(mk.report(name, x), f"phone {mk.phone_loudness(x):.1f}  mono loss {mk.lufs(x) - mono:.1f} LU")
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
