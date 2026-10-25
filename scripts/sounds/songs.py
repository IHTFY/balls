"""The two background loops: a bouncy one for the menus and a calmer one for play.

Each song is written out bar by bar: chords, a melody in scale degrees, and
the parts that play them. Tracks are mixed by target loudness (LUFS of the
track alone): melody about -27, accompaniment -31 to -34, pad -37,
percussion -38 to -44. home() and play() return a Song; render.py renders it.

Chords use add-nine instead of major sevenths: a close-voiced major seventh
puts the seventh a semitone from the root, which rubs against the tune.
"""

import pedalboard as pb

import musickit as mk
from instruments import kit


def expand(bars):
    """[["F"], ["C7sus4", "C7"]] -> chord symbols, their lengths in beats, and start beats."""
    chords, lengths, starts = [], [], []
    beat = 0
    for bar in bars:
        for c in bar:
            chords.append(c)
            lengths.append(4 / len(bar))
            starts.append(beat)
            beat += 4 / len(bar)
    return chords, lengths, starts


def bass_root(symbol):
    return mk.chord(symbol, 2)[0] + 12


def reverb(room=0.5, wet=0.18, dry=0.85):
    return pb.Pedalboard([pb.Reverb(room_size=room, wet_level=wet, dry_level=dry, width=1.0, damping=0.6)])


def soft_pad(cutoff):
    return pb.Pedalboard([pb.LowpassFilter(cutoff), pb.Reverb(room_size=0.85, wet_level=0.3, dry_level=0.7)])


def master():
    return pb.Pedalboard(
        [
            pb.HighpassFilter(45),
            pb.Compressor(threshold_db=-18, ratio=2.0, attack_ms=20, release_ms=250),
        ]
    )


# ------------------------------------------------------------------ menus: F major, 96 BPM

HOME_INTRO = [["Fadd9"], ["Bbadd9"], ["Fadd9"], ["C7sus4", "C7"]]
HOME_A = [["F"], ["Am7"], ["Bbadd9"], ["C7sus4", "C7"], ["F"], ["Dm7"], ["Gm7"], ["C7"]]
HOME_B = [["Bbadd9"], ["C"], ["Am7"], ["Dm"], ["Gm7"], ["Am7"], ["Bbadd9"], ["C7sus4", "C7"]]
HOME_A2 = [["F"], ["Am7"], ["Bbadd9"], ["C7sus4", "C7"], ["F"], ["Dm7"], ["Gm7", "C7"], ["F"]]
HOME_OUTRO = HOME_INTRO

HOME_TUNE_A = """
1' - 5 6 5 - 3 - | 3 - 5 - 7 - 6 5 | 4 - 6 - 1' - 6 - | 5 - - - 4 3 2 - |
1' - 5 6 5 - 3 - | 6 - 1' - 3' - 2' 1' | 2' - 1' - 6 - 4 - | 5 6 5 3 2 - . . |
"""
HOME_TUNE_B = """
. 6 1' 6 . 4 6 - | . 5 7 5 . 3 5 - | . 3 5 7 . 5 3 - | 6 - 1' - 6 5 6 - |
. 2' 1' 6 . 4 6 - | . 3' 2' 7 . 5 7 - | 2' - 1' - 6 - 4 - | 5 - - - . . 5 6 |
"""
HOME_TUNE_A2 = """
1' - 5 6 5 - 3 - | 3 - 5 - 7 - 6 5 | 4 - 6 - 1' - 6 - | 5 - - - 4 3 2 - |
1' - 5 6 5 - 3 - | 6 - 1' - 3' - 2' 1' | 2' - 1' - 7 - 5 - | 1' - - - - - . . |
"""


def home():
    song = mk.Song(bpm=96)
    k = kit()
    scale, high = mk.Scale("F4", "major"), mk.Scale("F5", "major")
    sections = [("intro", HOME_INTRO), ("a", HOME_A), ("b", HOME_B), ("a2", HOME_A2), ("outro", HOME_OUTRO)]
    bars = [b for _, s in sections for b in s]
    chords, lengths, starts = expand(bars)
    voicings = mk.voice_lead(chords, 4)
    section_of = [name for name, s in sections for _ in s]

    def track(name, instrument, loudness, position=0.0, fx=None, humanize=0.004):
        return song.track(k[instrument], name=name, loudness=loudness, position=position, fx=fx, humanize=humanize)

    comp = track("comp", "marimba", -32, -0.25, reverb(0.35, 0.12))
    bass = track("bass", "bass_pizz", -31, 0.05, reverb(0.3, 0.08), 0.003)
    pizz = track("pizz", "violin_pizz", -37, 0.35, reverb(0.5, 0.2), 0.006)
    lead = track("lead", "marimba", -28, 0.15, reverb(0.45, 0.16), 0.003)
    glock = track("glock", "glock", -33, 0.2, reverb(0.55, 0.22), 0.003)
    flute = track("flute", "flute_stac", -27, 0.25, reverb(0.6, 0.25))
    kalimba = track("kalimba", "kalimba", -33, -0.4, reverb(0.6, 0.25))
    pad = track("pad", "pad_still", -38, 0.0, soft_pad(3500), 0)
    shaker = track("shaker", "shaker", -40, 0.45)
    kick = track("kick", "bass_drum", -37, 0.0, None, 0)
    conga = track("conga", "conga", -40, -0.3)
    clave = track("clave", "claves", -43, 0.3, None, 0)

    # Chord parts follow every chord change.
    for i, (c, length, at) in enumerate(zip(chords, lengths, starts)):
        low, tones = voicings[i]
        part = section_of[int(at // 4)]
        root, nxt = bass_root(c), bass_root(chords[(i + 1) % len(chords)])
        # Bass: root, the fifth nearer the next root, then a step into it.
        bass.note(at, root, min(1.5, length * 0.45), 0.7)
        if length >= 4:
            fifth = root + 7 if abs(root + 7 - nxt) < abs(root - 5 - nxt) else root - 5
            bass.note(at + 2, fifth, 1.2, 0.62)
        if length >= 2 and nxt != root:
            step = 2 if abs(nxt - root) > 2 else 1
            bass.note(at + length - 0.5, nxt - step if nxt > root else nxt + step, 0.4, 0.5)
        # Marimba comp: low root on the beat, chord tones on the off-beats.
        for b in range(int(length)):
            if (at + b) % 2 == 0:
                comp.note(at + b, low + 12, 0.5, 0.5)
            comp.note(at + b + 0.5, tones, 0.4, 0.42 if b % 2 else 0.36)
        if part != "intro":
            pad.note(at, tones, length, 0.5)
        if part in ("a", "a2"):
            for off in (1, 3):
                if off < length:
                    pizz.note(at + off, tones, 0.3, 0.45)
        if part in ("b", "outro"):
            # Kalimba: up through the chord and back down, in eighths.
            up = tones + [tones[0] + 12]
            pattern = (up + up[-2:0:-1]) * 2
            for j in range(int(length * 2)):
                kalimba.note(at + j * 0.5, pattern[j] + 12, 0.5, 0.5 if j % 2 == 0 else 0.42)

    first = {name: section_of.index(name) for name, _ in sections}
    mk.phrase(lead, song.bar(first["a"]), HOME_TUNE_A, scale, velocity=0.55)
    mk.phrase(glock, song.bar(first["a"]), HOME_TUNE_A, high, velocity=0.5)
    mk.phrase(flute, song.bar(first["b"]), HOME_TUNE_B, scale, velocity=0.5, legato=0.8)
    mk.phrase(glock, song.bar(first["a2"]), HOME_TUNE_A2, high, velocity=0.55)
    mk.phrase(flute, song.bar(first["a2"]), HOME_TUNE_A2, scale, velocity=0.45, legato=0.7)

    for bar, part in enumerate(section_of):
        b0 = song.bar(bar)
        for j in range(8):
            shaker.hit(b0 + j * 0.5, 0.55 if j % 2 == 0 else 0.35)
        if part != "intro":
            kick.hit(b0, 0.55)
            kick.hit(b0 + 2.5, 0.35)
            conga.hit(b0 + 1.5, 0.45)
            conga.hit(b0 + 3, 0.5)
            conga.hit(b0 + 3.5, 0.35, pitch=65)
        if bar % 2 == 1:
            clave.hit(b0 + 3.5, 0.5)

    song.length_bars = len(bars)
    return song


# ------------------------------------------------------------------ play: D major, 78 BPM

PLAY_A = [["Dadd9"], ["Bm7"], ["Gadd9"], ["Asus4", "A"], ["Dadd9"], ["F#m7"], ["Gadd9"], ["Asus4", "A"]]
PLAY_B = [["Em7"], ["F#m7"], ["Gadd9"], ["A"], ["Bm7"], ["F#m7"], ["Gadd9"], ["A7sus4"]]

PLAY_TUNE_A2 = """
3' - - - 2' - 1' - | 2' - - - 1' - 6 - | 1' - - - 6 - 5 - | 1' - - - 7 - . . |
3' - - - 2' - 1' - | 2' - - - 3' - 5' - | 4' - - - 3' - 2' - | 1' - - - 7 - . . |
"""
PLAY_TUNE_B = """
2' - - - 5 - - - | 3' - - - 6 - - - | 5' - - - 4' - - - | 2' - - - - - - - |
1' - - - 6 - - - | 7 - - - 3' - - - | 1' - 2' - 5' - 4' - | 2' - - - - - - - |
"""
PLAY_TUNE_A3 = """
3' - - - 2' - 1' - | 2' - - - 1' - 6 - | 1' - - - 6 - 5 - | 1' - - - 7 - . . |
3' - - - 2' - 1' - | 2' - - - 3' - 5' - | 4' - 3' - 2' - 1' - | 2' - - - - - . . |
"""


def play():
    song = mk.Song(bpm=78)
    k = kit()
    scale = mk.Scale("D4", "major")
    sections = [("a", PLAY_A), ("a2", PLAY_A), ("b", PLAY_B), ("a3", PLAY_A)]
    bars = [b for _, s in sections for b in s]
    chords, lengths, starts = expand(bars)
    voicings = mk.voice_lead(chords, 4)
    section_of = [name for name, s in sections for _ in s]

    def track(name, instrument, loudness, position=0.0, fx=None, humanize=0.005):
        return song.track(k[instrument], name=name, loudness=loudness, position=position, fx=fx, humanize=humanize)

    vibes = track("vibes", "vibes_soft", -33, -0.2, reverb(0.6, 0.22))
    harp = track("harp", "harp", -32, 0.3, reverb(0.65, 0.25), 0.004)
    bass = track("bass", "bass_pizz", -33, 0.0, reverb(0.4, 0.1), 0.003)
    piano = track("piano", "piano", -27, 0.1, reverb(0.7, 0.25), 0.006)
    chimes = track("chimes", "chimes", -28, 0.2, reverb(0.7, 0.28), 0.004)
    pad = track("pad", "pad_verb", -37, 0.0, soft_pad(3000), 0)
    shaker = track("shaker", "shaker", -44, 0.4, None, 0.006)
    tri = track("tri", "triangle", -42, 0.5, None, 0)

    for i, (c, length, at) in enumerate(zip(chords, lengths, starts)):
        low, tones = voicings[i]
        part = section_of[int(at // 4)]
        root = bass_root(c)
        # Bass: calm half notes, no walking.
        bass.note(at, root, min(length, 2) * 0.8, 0.55)
        if length == 4:
            bass.note(at + 2, root + 7, 1.6, 0.45)
        pad.note(at, tones, length, 0.5)
        if part != "b":
            # Vibes: a slow rocking figure through the chord, in eighths.
            order = [0, 1, 2, 3, 2, 1, 0, 1]
            for j in range(int(length * 2)):
                vibes.note(at + j * 0.5, tones[order[j] % len(tones)], 0.9, 0.48 if j % 4 == 0 else 0.42)
        elif at % 4 == 0:
            # Harp: a rising ripple at the start of each bar, then two soft chord tones.
            ripple = [low + 12, *tones, tones[0] + 12, tones[1] + 12]
            for j, p in enumerate(ripple):
                harp.note(at + j * 0.25, p, 2.0, 0.45 + 0.03 * j)
            harp.note(at + 2.5, tones[-1] + 12, 1.0, 0.4)
            harp.note(at + 3.0, tones[1] + 12, 1.0, 0.36)

    for bar, part in enumerate(section_of):
        b0 = song.bar(bar)
        if part == "b":
            for j in range(8):
                shaker.hit(b0 + j * 0.5, 0.45 if j % 2 == 0 else 0.3)
        if bar % 8 == 0:
            tri.hit(b0, 0.4)

    first = {name: section_of.index(name) for name, _ in sections}
    mk.phrase(piano, song.bar(first["a2"]), PLAY_TUNE_A2, scale, velocity=0.5)
    mk.phrase(chimes, song.bar(first["b"]), PLAY_TUNE_B, scale, velocity=0.5)
    mk.phrase(piano, song.bar(first["a3"]), PLAY_TUNE_A3, scale, velocity=0.5)

    song.length_bars = len(bars)
    return song
