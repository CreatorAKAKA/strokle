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
    candidates = {}

    for entry in jam.lookup(
        f"%{kanji}%",
        lookup_chars=False,
        lookup_ne=False
    ).entries:
        definitions = []

        for sense in entry.senses:
            for gloss in sense.gloss:
                definitions.append(gloss.text)

        if not definitions:
            continue

        for form in entry.kanji_forms:
            word = form.text

            if word.count(kanji) != 1 or len(word) < 2:
                continue

            kanji_count = len(re.findall(r"[一-龯]", word))
            priority = get_priority(form.pri or [])

            score = priority

            if kanji_count >= 2:
                score += 50

            candidates[word] = {
                "word": word.replace(kanji, "□"),
                "meaning": "; ".join(definitions[:2]),
                "score": score
            }

    ranked = sorted(
        candidates.values(),
        key=lambda item: item["score"],
        reverse=True
    )

    return [
        {
            "word": item["word"],
            "meaning": item["meaning"]
        }
        for item in ranked[:3]
    ]


with open(DATA_DIR / "strokle-hints.json", encoding="utf-8") as f:
    hints = json.load(f)

for kanji, data in hints.items():
    if not data["vocabulary"]:
        data["vocabulary"] = get_vocabulary(kanji)
        print(kanji, data["vocabulary"], flush=True)

with open(
    DATA_DIR / "strokle-hints.json",
    "w",
    encoding="utf-8"
) as f:
    json.dump(hints, f, ensure_ascii=False, indent=2)

print("Done!")
print("Missing vocabulary:", sum(
    not item["vocabulary"] for item in hints.values()
))