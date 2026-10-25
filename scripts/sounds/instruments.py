"""The instruments both the songs and the sound effects use, loaded once."""

from functools import cache

import musickit as mk

IDIO = "VCSL/Idiophones/Struck Idiophones"
MEMBRANE = "VCSL/Membranophones/Struck Membranophones"


@cache
def kit():
    return {
        "marimba": mk.Sampler(f"{IDIO}/Marimba/*.wav"),
        "vibes_soft": mk.Sampler(f"{IDIO}/Vibraphone/Soft Mallets/*.wav", release=1.2),
        "vibes_hard": mk.Sampler(f"{IDIO}/Vibraphone/Hard Mallets/*.wav"),
        "vibes_muted": mk.Sampler(f"{IDIO}/Vibraphone/Hard Mallets/*.wav", release=0.08),
        # The glockenspiel sounds an octave above its written notes.
        "glock": mk.Sampler(f"{IDIO}/Glockenspiel/*.wav", tune=12),
        "chimes": mk.Sampler(f"{IDIO}/Hand Chimes/*.wav"),
        "kalimba": mk.Sampler(
            "VCSL/Idiophones/Plucked Idiophones/Kalimba, Kenya/*.wav", exclude=("B4_k15",), autotune=True
        ),
        "harp": mk.Sampler("VCSL/Chordophones/Composite Chordophones/Concert Harp/*.wav"),
        "piano": mk.Sampler(
            "VCSL/Chordophones/Zithers/Upright Piano, Yamaha/Sustains/*.wav", release=0.6, autotune=True
        ),
        "violin_pizz": mk.Sampler("VSCO-2-CE/Strings/Violin Section/Pizz/*.wav"),
        "bass_pizz": mk.Sampler("VSCO-2-CE/Strings/Solo Contrabass/Pizz/*.wav"),
        "flute_stac": mk.Sampler("VSCO-2-CE/Woodwinds/Flute/stac/*.wav", release=0.15),
        "pad_still": mk.Surge("Pads/Still"),
        "pad_verb": mk.Surge("Pads/Verb Pad"),
        "shaker": mk.Sampler(f"{IDIO}/Shaker, Small/Mid_ShakerHighFaster_*.wav"),
        "shaker_roll": mk.Sampler(f"{IDIO}/Shaker, Small/Mid_Shaker_Roll_Fast_*.wav"),
        "bass_drum": mk.Sampler(f"{MEMBRANE}/Bass Drum 1/*.wav"),
        "conga": mk.Sampler(f"{MEMBRANE}/Conga/Conga_HitN_*.wav"),
        "claves": mk.Sampler(f"{IDIO}/Claves/Claves1_*.wav"),
        "triangle": mk.Sampler(f"{IDIO}/Triangles/Triangle1_Hit_v*.wav"),
        "woodblock": mk.Sampler(f"{IDIO}/Woodblock/wood_click_*.wav"),
        "tambourine": mk.Sampler(f"{IDIO}/Tambourine 1/Tamb1_Hit_*.wav"),
        "mark_trees": mk.Sampler(f"{IDIO}/Mark Trees/Legacy/windchimes_fastAsc1.wav"),
        "mark_trees_slow": mk.Sampler(f"{IDIO}/Mark Trees/Legacy/windchimes_slowAsc1.wav"),
    }
