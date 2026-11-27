import json
import re
import unicodedata
from pathlib import Path
from jamdict import Jamdict

jam = Jamdict()

DATA_DIR = Path(__file__).resolve().parent / "src" / "data"

with open(DATA_DIR / "joyo.json", encoding="utf-8") as f:
    joyo = json.load(f)


def get_radical(kanji):
    for char in jam.lookup(kanji, lookup_ne=False).chars:
        if char.literal != kanji:
            continue

        for radical in char.radicals:
            if radical.rad_type == "classical":
                number = int(radical.value)
                return unicodedata.normalize(
                    "NFKC", chr(0x2F00 + number - 1)
                )

    return None


def get_priority(tags):
    score = 0

    for tag in tags:
        if tag in ("ichi1", "news1", "spec1"):
            score += 100
        elif tag in ("ichi2", "news2", "spec2"):
            score += 30
        elif tag.startswith("nf") and tag[2:].isdigit():
            score += 50 - int(tag[2:])

    return score


def get_vocabulary(kanji):
    candidates = []

    for entry in jam.lookup(
        f"%{kanji}%",
        lookup_chars=False,
        lookup_ne=False
    ).entries:

        entry_candidates = []

        for form in entry.kanji_forms:
            word = form.text

            if word.count(kanji) != 1 or len(word) < 2:
                continue

            readings = [
                kana for kana in entry.kana_forms
                if not kana.nokanji
                and (not kana.restr or word in kana.restr)
            ]

            if not readings:
                continue

            reading = max(
                readings,
                key=lambda kana:
                    get_priority(kana.pri or [])
                    - 30 * len(kana.info or [])
            ).text

            definitions = []

            for sense in entry.senses:
                if sense.stagk and word not in sense.stagk:
                    continue

                if sense.stagr and reading not in sense.stagr:
                    continue

                for gloss in sense.gloss:
                    if gloss.text not in definitions:
                        definitions.append(gloss.text)

            if not definitions:
                continue

            score = get_priority(form.pri or [])

            # Prefer standard spellings
            score -= 30 * len(form.info or [])

            # Prefer concise vocabulary over long phrases
            score -= max(0, len(word) - 3) * 5

            entry_candidates.append({
                "word": word.replace(kanji, "□"),
                "reading": reading,
                "meaning": "; ".join(definitions[:2]),
                "score": score
            })

        # Keep only the best spelling from each entry
        if entry_candidates:
            candidates.append(
                max(entry_candidates, key=lambda item: item["score"])
            )

    ranked = sorted(
        candidates,
        key=lambda item: item["score"],
        reverse=True
    )

    selected = []
    seen = set()

    for item in ranked:
        if item["word"] in seen:
            continue

        seen.add(item["word"])

        selected.append({
            "word": item["word"],
            "reading": item["reading"],
            "meaning": item["meaning"]
        })

        if len(selected) == 4:
            break

    return selected


with open(DATA_DIR / "strokle-hints.json", encoding="utf-8") as f:
    hints = json.load(f)

for index, (kanji, data) in enumerate(hints.items(), 1):
    data["vocabulary"] = get_vocabulary(kanji)

    print(
        f"[{index}/{len(hints)}] {kanji}:",
        [item["word"] for item in data["vocabulary"]],
        flush=True
    )

with open(
    DATA_DIR / "strokle-hints.json",
    "w",
    encoding="utf-8"
) as f:
    json.dump(hints, f, ensure_ascii=False, indent=2)

print("Done!")

from collections import Counter

counts = Counter(
    len(data["vocabulary"])
    for data in hints.values()
)

for count, total in sorted(counts.items()):
    print(f"{count} hints: {total} kanji")