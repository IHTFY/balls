"""The sound effects, packed into one sprite file plus an index of where each starts.

Every effect is played by recorded instruments. Loudness is matched on what a
phone speaker plays (500 Hz to 8 kHz, loudest 400 ms): most effects at
TARGET, frequent background ones (tap, tick, whoosh) a little lower, and
peaks stay at or below -2 dBFS by plain scaling, never limiting.
"""

import json
from pathlib import Path

import numpy as np
import pedalboard as pb

import musickit as mk
from instruments import kit

TARGET = -16.0
QUIET = -18.0
INDEX = Path(__file__).resolve().parents[2] / "src/lib/fx/sfx-sprite.json"

# Pitched effects are rendered in C major and the game shifts them into the key of
# the music playing (src/lib/fx/pitch.js). Picks and drops cover two octaves from
# C4, one note per scale step; completions are an arpeggio on each step from C5.
MAJOR = [0, 2, 4, 5, 7, 9, 11]
NOTES = 14


def scale_note(step, tonic=60):
    return tonic + 12 * (step // 7) + MAJOR[step % 7]


def room(wet=0.12, low_cut=250):
    """A small room, after cutting the lows a phone speaker can't play anyway: they
    only raise the peak and hold the effect below its loudness target."""
    return pb.Pedalboard(
        [pb.HighpassFilter(low_cut), pb.Reverb(room_size=0.3, wet_level=wet, dry_level=0.9, damping=0.5)]
    )


def band(low=500, high=7000):
    return pb.Pedalboard([pb.HighpassFilter(low), pb.LowpassFilter(high)])


def one_shot(parts, fx=room()):
    """parts: [(instrument, [(seconds, note, length, velocity)])] -> a mono one-shot."""
    k = kit()
    length = int((max(s + d for _, notes in parts for s, _, d, _ in notes) + 3.0) * mk.SR)
    x = sum(k[name].render([(s, n, d, v) for s, n, d, v in notes], length) for name, notes in parts)
    if fx is not None:
        x = mk.to_stereo(fx(x, mk.SR, reset=True))
    return x.mean(axis=0, keepdims=True)


def pick(step):
    p = scale_note(step)
    return one_shot([("marimba", [(0, p, 0.3, 0.75)]), ("glock", [(0.005, p + 24, 0.3, 0.25)])])


def drop(step):
    p = scale_note(step)
    return one_shot(
        [
            ("violin_pizz", [(0, p, 0.3, 0.3)]),
            ("woodblock", [(0, 72, 0.1, 0.15)]),
        ],
        room(0.1, 400),
    )


def complete(step):
    # A rising arpeggio on the chord of this scale step: root, third, fifth, octave.
    arp = [scale_note(step + d, 72) for d in (0, 2, 4, 7)]
    notes = [(i * 0.07, p, 0.6, 0.8 + 0.05 * i) for i, p in enumerate(arp)]
    return one_shot([("glock", notes), ("harp", [(s, n - 12, d, v * 0.4) for s, n, d, v in notes])], room(0.2, 400))


def chime(step):
    # Rings under a completion in a combo, on its chord's root.
    return one_shot([("chimes", [(0, scale_note(step, 72), 1.0, 0.6)])], room(0.2, 400))


def win():
    gliss = [(i * 0.035, p, 0.8, 0.25 + 0.015 * i) for i, p in enumerate([60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79, 81, 83, 84])]
    fanfare = [(0.6, 79, 0.15, 0.7), (0.75, 79, 0.15, 0.6), (0.9, 84, 1.2, 0.8)]
    return one_shot(
        [
            ("harp", gliss),
            ("glock", [(s, n, d, v * 0.8) for s, n, d, v in fanfare]),
            ("marimba", [(s, n - 12, d, v) for s, n, d, v in fanfare]),
            ("violin_pizz", [(0.9, n, 0.5, 0.7) for n in (60, 64, 67, 72)]),
            ("bass_pizz", [(0.9, 48, 1.0, 0.5)]),
            ("mark_trees", [(0.95, 60, 2.0, 0.5)]),
        ],
        room(0.22),
    )


def star(n):
    p = [76, 79, 84][n - 1]
    return one_shot([("chimes", [(0, p, 1.2, 0.7)]), ("glock", [(0.005, p + 12, 0.5, 0.3)])], room(0.2))


def coin():
    return one_shot([("glock", [(0, 83, 0.1, 0.65), (0.07, 88, 0.6, 0.75)])])


def tap():
    return one_shot([("woodblock", [(0, 60, 0.05, 0.15)])], band(600, 9000))


def undo():
    return one_shot([("marimba", [(0, 79, 0.2, 0.6), (0.06, 76, 0.2, 0.55), (0.12, 72, 0.3, 0.5)])])


def invalid():
    return one_shot(
        [("vibes_muted", [(0, 68, 0.12, 0.6), (0.13, 64, 0.2, 0.55)]), ("woodblock", [(0, 55, 0.1, 0.15)])],
        room(0.08, 400),
    )


def hint():
    return one_shot(
        [
            ("mark_trees", [(0, 60, 1.0, 0.45)]),
            ("glock", [(0.05, 88, 0.3, 0.45), (0.11, 91, 0.3, 0.45), (0.17, 96, 0.5, 0.5)]),
        ],
        room(0.2),
    )


def reveal():
    return one_shot([("vibes_hard", [(0, 69, 0.8, 0.6)]), ("glock", [(0.005, 93, 0.4, 0.2)])], room(0.2))


def buy():
    return one_shot(
        [
            ("tambourine", [(0, 60, 0.3, 0.55)]),
            ("glock", [(0.04, 84, 0.2, 0.55), (0.1, 88, 0.2, 0.6), (0.16, 91, 0.6, 0.7)]),
        ]
    )


def tick():
    return one_shot([("claves", [(0, 60, 0.05, 0.3)])], band(600, 9000))


def whoosh():
    # Restart: a quick harp sweep down two octaves over a soft shaker.
    sweep = [84, 83, 81, 79, 77, 76, 74, 72, 71, 69, 67, 65, 64, 62, 60]
    return one_shot(
        [
            ("harp", [(i * 0.018, p, 0.3, 0.6 - 0.015 * i) for i, p in enumerate(sweep)]),
            ("shaker_roll", [(0, 60, 0.3, 0.3)]),
        ],
        room(0.15, 400),
    )


def sounds():
    """(name, sound, phone loudness target, longest it may ring in seconds)."""
    yield from ((f"pick{n}", pick(n), QUIET + 1, 0.6) for n in range(NOTES))
    yield from ((f"drop{n}", drop(n), QUIET - 1.5, 0.5) for n in range(NOTES))
    yield from ((f"complete{n}", complete(n), TARGET, 1.6) for n in range(7))
    yield from ((f"chime{n}", chime(n), TARGET - 3, 1.3) for n in range(7))
    yield "win", win(), TARGET, 3.2
    yield from ((f"star{n}", star(n), TARGET, 1.5) for n in (1, 2, 3))
    yield "coin", coin(), TARGET, 0.9
    yield "tap", tap(), QUIET, 0.15
    yield "undo", undo(), TARGET - 1, 0.7
    yield "invalid", invalid(), TARGET, 0.5
    yield "hint", hint(), TARGET, 1.5
    yield "reveal", reveal(), TARGET, 1.2
    yield "buy", buy(), TARGET, 1.0
    yield "tick", tick(), QUIET, 0.15
    yield "whoosh", whoosh(), QUIET, 0.8


def render_all(out):
    rendered = []
    for name, x, target, longest in sounds():
        x = mk.trim_silence(x[:, : int(longest * mk.SR)], floor_db=-80)
        x = mk.fade(x, fade_out=min(longest * 0.4, x.shape[-1] / mk.SR))
        x, _, peak = mk.normalize(x, target, measure=mk.phone_loudness)
        x = mk.trim_silence(x, floor_db=-60)
        flag = "  (held at the peak ceiling)" if mk.phone_loudness(x) < target - 0.5 else ""
        print(mk.report(name, x) + flag)
        rendered.append((name, x))
    buffer, index = mk.sprite(rendered)
    mk.write_wav(buffer, "/tmp/balls-sfx.wav")
    mk.export(buffer, Path(out) / "sfx", bitrate="48k")
    INDEX.write_text(json.dumps(index, indent="\t") + "\n")
    print(f"sprite {buffer.shape[-1] / mk.SR:.1f} s, {len(index)} sounds; peak {mk.peak_db(buffer):.1f} dBFS")
    return np.asarray(buffer)
