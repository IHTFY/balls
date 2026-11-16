"""The background loops: synthwave for the menus, a calm electronic loop for play,
and electro house for Blitz.

All three share one theme, four two-bar cells in scale degrees (THEME), so the
game sounds like one piece: the menu plays it at walking pace, play stretches it
to half speed, and Blitz plays it over a four-on-the-floor kick in the minor.
The keys (F major, D major, A minor) are the ones the pitched effects are shifted
into (KEYS in src/lib/fx/pitch.js).

Each song is two Songs on one beat grid: `music` (pitched parts, checked for
clashes and pumped by the kick) and `drums`. Tracks are mixed by target loudness
(LUFS of the track alone): lead about -25 to -27, accompaniment 4 to 6 LU under,
pads 10 under; electronic drums and bass sit near the lead.

Accompaniment is written as step strings, one character per sixteenth note:
in `comp`, a digit is a chord tone (0 lowest; 4 to 7 are 0 to 3 an octave up),
"*" is the whole chord, "-" holds and "." rests; in `bassline`, R is the root,
O its octave, F the fifth, N a step into the next chord's root.

Chords use add-nine instead of major sevenths: a close-voiced major seventh
puts the seventh a semitone from the root, which rubs against the tune.
"""

import pedalboard as pb

import musickit as mk
from musickit import drums as dr
from musickit import fx

# One motif, four cells of two bars in eighth notes: A states it, B answers, A2 is A
# from another degree, C closes on the tonic.
THEME = {
    "A": "5 . 1' - 7 1' 2' - | 1' - - 5 6 - . .",
    "B": "4 . 6 - 5 6 1' - | 7 - - 5 3 - . .",
    "A2": "3 . 6 - 5 6 7 - | 6 - - 5 4 - . .",
    "C": "6 - 5 - 4 - 3 2 | 1 - - - . . . .",
}


def cells(*names):
    return " | ".join(THEME[n] for n in names)


def chord_bars(bars):
    """[["F"], ["C7sus4", "C"]] -> [(symbol, start beat, beats)]."""
    out, beat = [], 0
    for bar in bars:
        for c in bar:
            out.append((c, beat, 4 / len(bar)))
            beat += 4 / len(bar)
    return out


def root(symbol, octave=2):
    return mk.chord(symbol, octave)[0] + 12


def pick(pattern, at):
    """A one- or two-bar step string's bar for the chord starting at beat `at`, from its offset in the bar."""
    bars = [p.replace(" ", "") for p in pattern.split("|")]
    return bars[int(at // 4) % len(bars)][int(round(at % 4 * 4)):]


def comp(track, at, length, tones, pattern, velocity=0.6, accent=0.12):
    """Plays a step string over one chord span, cut to `length` beats."""
    ext = tones + [t + 12 for t in tones]
    steps = pick(pattern, at)
    i = 0
    while i < len(steps) and i * 0.25 < length:
        ch = steps[i]
        if ch in "-.":
            i += 1
            continue
        j = i + 1
        while j < len(steps) and steps[j] == "-":
            j += 1
        beats = min((j - i) * 0.25, length - i * 0.25) * 0.92
        pitch = tones if ch == "*" else ext[int(ch) % len(ext)]
        track.note(at + i * 0.25, pitch, beats, velocity + (accent if i % 4 == 0 else 0))
        i = j


def bassline(track, at, length, symbol, next_symbol, pattern, velocity=0.75, octave=2):
    r, nxt = root(symbol, octave), root(next_symbol, octave)
    steps = pick(pattern, at)
    i = 0
    while i < len(steps) and i * 0.25 < length:
        ch = steps[i]
        if ch in "-.":
            i += 1
            continue
        j = i + 1
        while j < len(steps) and steps[j] == "-":
            j += 1
        pitch = {"R": r, "O": r + 12, "F": r + 7, "N": nxt + (-2 if nxt > r else 2) if nxt != r else r}[ch]
        beats = min((j - i) * 0.25, length - i * 0.25) * 0.9
        track.note(at + i * 0.25, pitch, beats, velocity + (0.1 if i % 8 == 0 else 0))
        i = j


def harmonics(drive_db=14.0, hp=350.0, lp=5000.0, level_db=-4.0):
    """A bass plus a saturated copy without its lows, so a phone speaker hears the line."""
    return pb.Pedalboard([
        pb.Mix([
            pb.Gain(0.0),
            pb.Pedalboard([
                pb.Distortion(drive_db=drive_db),
                pb.HighpassFilter(hp), pb.HighpassFilter(hp), pb.HighpassFilter(hp),
                pb.LowpassFilter(lp), pb.Gain(level_db),
            ]),
        ])
    ])


def space(bpm, note="1/8.", feedback=0.3, mix=0.2, room=0.6, wet=0.18):
    return pb.Pedalboard([
        fx.delay(bpm, note, feedback, mix),
        pb.Reverb(room_size=room, wet_level=wet, dry_level=0.85, damping=0.5, width=0.6),
    ])


def verb(room=0.7, wet=0.25):
    return pb.Pedalboard([pb.Reverb(room_size=room, wet_level=wet, dry_level=0.8, damping=0.5, width=0.7)])


def punch(threshold=-14.0):
    """Drum bus: a fast compressor and a limiter, so the kick's peak doesn't set the
    whole mix's level (the loop is normalized by scaling, under a -2 dBFS ceiling)."""
    return pb.Pedalboard([pb.Compressor(threshold_db=threshold, ratio=4, attack_ms=2, release_ms=80),
                          pb.Limiter(threshold_db=threshold + 6, release_ms=60)])


class Loop:
    """A song's two halves and how to finish it."""

    def __init__(self, bpm, bars, style, duck):
        self.music, self.drums = mk.Song(bpm), mk.Song(bpm)
        self.bpm, self.bars, self.style, self.duck = bpm, bars, style, duck


def chords_for(loop, sections):
    """sections: [(name, [[chord, ...] per bar])] -> [(symbol, at, length, section, voicing)]."""
    bars = [b for _, s in sections for b in s]
    names = [n for n, s in sections for _ in s]
    spans = chord_bars(bars)
    voices = mk.voice_lead([c for c, _, _ in spans], 4)
    return [(c, at, ln, names[int(at // 4)], voices[i][1]) for i, (c, at, ln) in enumerate(spans)]


def first_bar(sections, name):
    bar = 0
    for n, s in sections:
        if n == name:
            return bar
        bar += len(s)
    raise KeyError(name)


# ------------------------------------------------------------------ menus: F major, 100 BPM synthwave

MENU_INTRO = [["F"], ["Dm7"], ["Bbadd9"], ["C7sus4"]]
MENU_A = [["F"], ["Dm7"], ["Bbadd9"], ["C"], ["Am7"], ["Gm7"], ["Bbadd9"], ["C7sus4"]]
MENU_B = [["Dm7"], ["Bbadd9"], ["Gm7"], ["C"], ["Dm7"], ["Bbadd9"], ["Ebadd9"], ["C7sus4", "C"]]

# B: long notes from the motif's opening leap, answered a step lower each time.
MENU_TUNE_B = """
. . 6 - 1' - 2' - | 1' - - - 6 - . . | . . 4 - 6 - 1' - | 7 - - - 5 - . . |
. . 6 - 1' - 2' - | 2' - - - 6 - . . | . . 5 - 4 - 5 6 | 5 - - - . . . . |
"""

MENU_ARP = {
    "intro": "0..2..1.3..2.1.. | ..0..2..1.3..2.. ",
    "a": "0.2.1..3.2..1.4. | .2..0.3..1.2.... ",
    "b": "4..3..2..1..0... | 2..3..4.....3.2. ",
    "a2": "0.2.4.2.1.3.5.3. | 0..2.4..3.2..1.. ",
}
MENU_BASS = {
    "intro": "R-------....R-O- | R-----F-....O-R-",
    "a": "R.R.O.R.R.R.ORF. | R.R.O.R..R.O.RN.",
    "b": "R--.R--.R.O.R.N. | R--.R--.F---O-R.",
    "a2": "R.R.O.R.R.R.ORN. | R.ROR.R..R.ORF..",
}


def menu():
    loop = Loop(100, 32, "synthwave", dict(beats=1, depth_db=3))
    m, bpm = loop.music, loop.bpm
    sections = [("intro", MENU_INTRO), ("a", MENU_A), ("b", MENU_B), ("a2", MENU_A), ("outro", MENU_INTRO)]
    spans = chords_for(loop, sections)

    lead = m.track(mk.Synth.preset("synthwave_lead", bpm=bpm, cutoff=2600), name="lead", loudness=-25,
                   fx=space(bpm, "1/8.", 0.32, 0.22, 0.75, 0.2))
    bell = m.track(mk.Synth.preset("bell", bpm=bpm), name="bell", loudness=-31, position=0.25,
                   fx=space(bpm, "1/4", 0.3, 0.2, 0.7, 0.2))
    pad = m.track(mk.Synth.preset("warm_pad", bpm=bpm, cutoff=1300), name="pad", loudness=-35, fx=verb(0.8, 0.25))
    arp = m.track(mk.Synth.preset("arp_pluck", bpm=bpm, cutoff=700), name="arp", loudness=-30, position=-0.3,
                  fx=space(bpm, "1/8.", 0.3, 0.2, 0.5, 0.12))
    bass = m.track(mk.Synth.preset("synthwave_bass", bpm=bpm), name="bass", loudness=-25, fx=harmonics(14, 320, 4500, -4))

    for i, (c, at, ln, part, tones) in enumerate(spans):
        nxt = spans[(i + 1) % len(spans)][0]
        pad.note(at, tones, ln, 0.5)
        key = "intro" if part == "outro" else part
        comp(arp, at, ln, tones, MENU_ARP[key], 0.5)
        bassline(bass, at, ln, c, nxt, MENU_BASS[key], 0.7)

    a, b, a2 = (first_bar(sections, n) for n in ("a", "b", "a2"))
    mk.phrase(lead, m.bar(a), cells("A", "B", "A2", "C"), mk.Scale("F4", "major"), velocity=0.6, legato=0.9)
    mk.phrase(lead, m.bar(b), MENU_TUNE_B, mk.Scale("F4", "major"), velocity=0.55, legato=0.95)
    mk.phrase(lead, m.bar(a2), cells("A", "B", "A2", "C"), mk.Scale("F4", "major"), velocity=0.6, legato=0.9)
    # The second time through, a bell answers the lead an octave up.
    mk.phrase(bell, m.bar(a2), cells("A", "B", "A2", "C"), mk.Scale("F5", "major"), velocity=0.45, legato=0.6)

    kit = loop.drums.track(mk.DrumKit("synthwave"), name="drums", loudness=-23, fx=punch(-14))
    for bar, part in enumerate(n for n, s in sections for _ in s):
        b0 = loop.drums.bar(bar)
        if part in ("intro", "outro"):
            dr.beat(kit, b0, {"kick": "x.......x.......", "hat": ("..x...x...x...x.", 0.5)})
        elif part == "b":
            dr.beat(kit, b0, {"kick": "x.......x.x.....", "snare": "....X.......X...",
                              "hat": ("x.x.x.x.x.x.x.x.", 0.55), "openhat": ("......x.......x.", 0.5)})
        else:
            dr.groove(kit, b0, "synthwave", velocity=0.75)
    for bar in (a, b, a2):
        kit.note(loop.drums.bar(bar), dr.note_number("crash"), 1, 0.6)
    for bar in (a - 1, b - 1, a2 - 1):
        dr.pattern(kit, loop.drums.bar(bar) + 3, "x.xx", pitch="snare", velocity=0.6)
    return loop


# ------------------------------------------------------------------ play: D major, 90 BPM, calm electronic

PLAY_INTRO = [["Dadd9"], ["Bm7"], ["Gadd9"], ["Asus4"]]
PLAY_A = [["Dadd9"], ["Asus2"], ["Gadd9"], ["Asus4", "A"], ["Bm7"], ["F#m7"], ["Gadd9"], ["A"]]
PLAY_B = [["Bm7"], ["Gadd9"], ["Dadd9"], ["A"], ["Bm7"], ["Gadd9"], ["Cadd9"], ["Asus4", "A"]]
PLAY_A3 = [["Dadd9"], ["Asus2"], ["Gadd9"], ["Asus4", "A"], ["Gadd9"], ["Em7"], ["Asus4"], ["Dadd9"]]

# B: the electric piano carries a falling answer while the lead rests (quarter notes).
PLAY_TUNE_B = """
. 3' 2' - 1' - - - | . 2' 1' - 7 - - - | . 3' 2' - 1' - 6 - | . . 5 - - - . . |
"""

PLAY_KEYS = {
    "intro": "*-------........ | ......*-------..",
    "a": "..*-...*--...... | *-.....*-.......",
    "b": "*-..*-....*-..*. | ..*-..*-....*-..",
    "a3": "..*-...*--...*.. | *-....*-..*-....",
}
PLAY_PLUCK = {
    "intro": "................ | ........4...3... ",
    "a": "....4.....3..... | ..2.....4....... ",
    "b": "4..3..2...4..5.. | 3..2..1.....0... ",
    "a3": "....4.....3..... | ..2..3..4....... ",
}
PLAY_BASS = {
    "intro": "R--------------- | R-----------F---",
    "a": "R-----R-....F--- | R-------..R-O---",
    "b": "R---....R--.O--- | R-----..F---R---",
    "a3": "R-----R-....F--- | R-------..R-O---",
}


def play():
    loop = Loop(90, 32, "synthwave", dict(beats=2, hits=[0, 1], depth_db=2))
    m, bpm = loop.music, loop.bpm
    sections = [("intro", PLAY_INTRO), ("a", PLAY_A), ("b", PLAY_B), ("a3", PLAY_A3), ("outro", PLAY_INTRO)]
    spans = chords_for(loop, sections)

    lead = m.track(
        mk.Synth(osc1=dict(wave="triangle"), osc2=dict(wave="square", level=0.18), slope=12, cutoff=2400,
                 resonance=0.05, amp=(0.02, 0.4, 0.75, 0.6), mono=True, glide=0.04,
                 lfo=dict(shape="sine", rate=5.0, pitch=0.12, fade=0.6, retrigger=True), gain=0.5),
        name="lead", loudness=-24, position=0.05, fx=space(bpm, "1/4.", 0.35, 0.25, 0.8, 0.25))
    keys = m.track(mk.Surge("Keys/EP 1"), name="keys", loudness=-29, position=-0.15, fx=verb(0.7, 0.22))
    pluck = m.track(mk.Synth.preset("pluck", bpm=bpm, cutoff=420), name="pluck", loudness=-32, position=0.3,
                    fx=space(bpm, "1/8.", 0.4, 0.3, 0.8, 0.25))
    pad = m.track(mk.Synth.preset("warm_pad", bpm=bpm, cutoff=1000), name="pad", loudness=-35, fx=verb(0.85, 0.3))
    bass = m.track(mk.Synth(osc1=dict(wave="sine"), osc2=dict(wave="triangle", level=0.4), filter=None,
                            amp=(0.01, 0.4, 0.8, 0.2), mono=True, glide=0.05, gain=0.55),
                   name="bass", loudness=-32, fx=harmonics(18, 300, 3500, 0))

    for i, (c, at, ln, part, tones) in enumerate(spans):
        nxt = spans[(i + 1) % len(spans)][0]
        pad.note(at, tones, ln, 0.5)
        key = "intro" if part == "outro" else part
        comp(keys, at, ln, tones, PLAY_KEYS[key], 0.45, 0.05)
        comp(pluck, at, ln, tones, PLAY_PLUCK[key], 0.45)
        bassline(bass, at, ln, c, nxt, PLAY_BASS[key], 0.6)

    a, b, a3 = (first_bar(sections, n) for n in ("a", "b", "a3"))
    scale = mk.Scale("D5", "major")
    # The theme at half speed: each cell spans four bars.
    mk.phrase(lead, m.bar(a), cells("A", "A2"), scale, step=1.0, velocity=0.55, legato=0.95)
    mk.phrase(keys, m.bar(b), PLAY_TUNE_B, scale, step=1.0, velocity=0.5, legato=0.9)
    mk.phrase(lead, m.bar(a3), cells("A", "C"), scale, step=1.0, velocity=0.55, legato=0.95)

    kit = loop.drums.track(mk.DrumKit("synthwave"), name="drums", loudness=-29, fx=punch(-20))
    for bar, part in enumerate(n for n, s in sections for _ in s):
        b0 = loop.drums.bar(bar)
        if part in ("intro", "outro"):
            dr.beat(kit, b0, {"shaker": ("x.o.x.o.x.o.x.o.", 0.5)})
        elif part == "b":
            dr.beat(kit, b0, {"kick": "x.........x.....", "rim": "....x.......x..o",
                              "shaker": ("xoxoxoxoxoxoxoxo", 0.5)})
        else:
            dr.beat(kit, b0, {"kick": "x.......x.......", "rim": "....x.......x...",
                              "hat": ("..x...x...x...x.", 0.45)})
    return loop


# ------------------------------------------------------------------ blitz: A minor, 128 BPM electro house

BLITZ_A = [["Am"], ["F"], ["Dm"], ["C"], ["F"], ["G"], ["Dm"], ["Esus4"]]
BLITZ_B = [["F"], ["G"], ["Em7"], ["Am"], ["F"], ["G"], ["Em7"], ["E"]]
BLITZ_DOWN = [["Am"], ["G"], ["C"], ["Dm"], ["F"], ["G"], ["Dm"], ["E"]]

# B: a sixteenth-note hook built on the motif's opening (1' 7 5), answered lower.
BLITZ_TUNE_B = """
1' . 1' . 7 . 5 . 6 - 5 . 3 . 5 . | 7 . 7 . 1' . 5 . 7 - 5 . 4 . 5 . |
7 . 7 . 5 . 2 . 4 - 5 . 7 . 5 . | 1' - - . 5 . 3 . 5 - - - . . . . |
1' . 1' . 7 . 5 . 6 - 5 . 3 . 5 . | 7 . 7 . 1' . 5 . 7 - 5 . 4 . 5 . |
7 . 7 . 5 . 2 . 4 - 5 . 7 . 5 . | 5 . 6 . #7 . 1' . 2' - - - #7 - - - |
"""

BLITZ_STAB = {
    "a": "*..*..*...*..*.. | *..*..*...*.*...",
    "b": "..*...*-..*...*. | ..*...*-..*.*-..",
    "down": "*--------------- | *-------*-------",
    "a2": "*..*..*...*.*... | *..*..*...*..*..",
}
BLITZ_ARP = {
    "a": "0.1.2.1.4.2.1.2. | 0.1.2.4..54.2.1. ",
    "b": "4.2.4.2.5.3.5.3. | 4.21.2.4.2..1.0. ",
    "down": "0..1..2..4..2... | 1..2..4.....4.2. ",
    "a2": "0.1.2.1.4.2.1.2. | 0.12..4.5.4.21.. ",
}
BLITZ_BASS = {
    "a": "..R...R...R...R. | ..R...R...R.O.R.",
    "b": "..R...R...R.O.R. | ..R.O.R...R...RN",
    "down": "R--------------- | R-------F-------",
    "a2": "..R...R...R...R. | ..R...R...R.O.RN",
}


def blitz():
    loop = Loop(128, 32, "edm", dict(beats=1, depth_db=6))
    m, bpm = loop.music, loop.bpm
    sections = [("a", BLITZ_A), ("b", BLITZ_B), ("down", BLITZ_DOWN), ("a2", BLITZ_A)]
    names = [n for n, s in sections for _ in s]
    spans = chords_for(loop, sections)

    lead = m.track(mk.Synth.preset("supersaw_lead", bpm=bpm, cutoff=4000), name="lead", loudness=-23,
                   fx=space(bpm, "1/8", 0.25, 0.16, 0.5, 0.14))
    square = m.track(mk.Synth(osc1=dict(wave="square"), filter=None, amp=(0.002, 0.08, 0.7, 0.05), gain=0.3),
                     name="square", loudness=-31, position=0.2)
    stab = m.track(mk.Synth.preset("stab", bpm=bpm), name="stabs", loudness=-27, fx=verb(0.5, 0.15))
    arp = m.track(mk.Synth.preset("arp_pluck", bpm=bpm), name="arp", loudness=-30, position=-0.3,
                  fx=space(bpm, "1/16", 0.2, 0.15, 0.4, 0.1))
    pad = m.track(mk.Synth.preset("warm_pad", bpm=bpm), name="pad", loudness=-34, fx=verb(0.8, 0.3))
    bass = m.track(mk.Synth(osc1=dict(wave="saw"), osc2=dict(wave="square", octave=-1, level=0.6), cutoff=700,
                            resonance=0.25, filter_env=(0.001, 0.12, 0.2, 0.05), filter_env_amount=24,
                            amp=(0.001, 0.15, 0.6, 0.04), gain=0.4),
                   name="bass", loudness=-27, fx=harmonics(16, 350, 5000, 0))
    sub = m.track(mk.Synth(osc1=dict(wave="sine"), filter=None, amp=(0.003, 0.2, 1.0, 0.06), gain=0.5),
                  name="sub", loudness=-34)

    for i, (c, at, ln, part, tones) in enumerate(spans):
        nxt = spans[(i + 1) % len(spans)][0]
        pad.note(at, tones, ln, 0.45)
        comp(stab, at, ln, tones, BLITZ_STAB[part], 0.6)
        comp(arp, at, ln, tones, BLITZ_ARP[part], 0.5)
        bassline(bass, at, ln, c, nxt, BLITZ_BASS[part], 0.8)
        if part != "down":
            sub.note(at, root(c, 2) - 12, ln * 0.97, 0.7)

    a, b, down, a2 = (first_bar(sections, n) for n in ("a", "b", "down", "a2"))
    minor = mk.Scale("A4", "minor")
    mk.phrase(lead, m.bar(a), cells("A", "B", "A2", "C"), minor, velocity=0.6, legato=0.88)
    mk.phrase(lead, m.bar(b), BLITZ_TUNE_B, minor, step=0.25, velocity=0.6, legato=0.85)
    mk.phrase(square, m.bar(b), BLITZ_TUNE_B, mk.Scale("A5", "minor"), step=0.25, velocity=0.5, legato=0.6)
    # The breakdown: the theme at half speed, no kick, a riser into the last section.
    mk.phrase(lead, m.bar(down), cells("A", "A2"), minor, step=1.0, velocity=0.5, legato=0.95)
    mk.phrase(lead, m.bar(a2), cells("A", "B", "A2", "C"), minor, velocity=0.6, legato=0.88)
    mk.phrase(square, m.bar(a2), cells("A", "B", "A2", "C"), mk.Scale("A5", "minor"), velocity=0.45, legato=0.6)
    riser = m.track(mk.Synth.preset("riser", bpm=bpm, pitch_env=(-12, 3.75, "lin"), filter_env=(3.75, 0.1, 1.0, 0.3)),
                    name="riser", loudness=-34)
    riser.note(m.bar(down + 6), 62, 8, 0.6)

    kit = loop.drums.track(mk.DrumKit("909"), name="drums", loudness=-23, fx=punch(-12))
    for bar, part in enumerate(names):
        b0 = loop.drums.bar(bar)
        if part == "down":
            if bar < down + 4:
                dr.beat(kit, b0, {"clap": "....x.......x...", "hat": ("..x...x...x...x.", 0.5)})
            else:
                dr.beat(kit, b0, {"kick": "x...x...x...x...", "clap": "....x.......x...",
                                  "hat": ("xo.oxo.oxo.oxo.o", 0.6)})
        else:
            dr.groove(kit, b0, "house", velocity=0.8)
    for bar in (a, b, down, a2):
        kit.note(loop.drums.bar(bar), dr.note_number("crash"), 1, 0.75)
    dr.pattern(kit, loop.drums.bar(b - 1) + 2, "x.x.xxxx", pitch="snare", velocity=0.55)
    dr.pattern(kit, loop.drums.bar(a2 - 1), "x.x.x.x.xxxxxxxx", pitch="snare", velocity=0.55, ramp=0.3)
    dr.pattern(kit, loop.drums.bar(loop.bars - 1) + 2, "x.x.xxxx", pitch="snare", velocity=0.5)
    return loop
