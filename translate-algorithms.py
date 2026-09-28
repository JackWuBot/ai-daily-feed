"""Translate algorithm summaries on the Actions runner; titles never enter the model."""
import json
import os
import re
import sys
from pathlib import Path

MODEL = "Helsinki-NLP/opus-mt-en-zh"
REVISION = "408d9bc410a388e1d9aef112a2daba955b945255"


def needs_translation(item):
    summary = item.get("summary", "")
    return (item.get("category") == "algorithm"
            and item.get("summaryKind") != "translated"
            and bool(re.search(r"[A-Za-z]{3}", summary))
            and not re.search(r"[\u4e00-\u9fff]", summary))


def apply_translation(item, summary):
    # Copy only the summary. Never accept titles, URLs or other fields from a model.
    if re.fullmatch(r"[A-Za-z][A-Za-z0-9_.-]*\s+v?\d+(?:\.\d+)+(?:[A-Za-z0-9.-]*)?", item["summary"].strip()):
        summary = "版本：" + item["summary"].strip() + "。"
    if not isinstance(summary, str) or not re.search(r"[\u4e00-\u9fff]", summary) or len(summary) > 1600:
        raise ValueError("Translation did not contain a usable Chinese summary")
    return {**item, "originalSummary": item["summary"], "summary": summary.strip(),
            "summaryKind": "translated", "translationMethod": "opus-mt-en-zh"}


def main():
    path = Path(sys.argv[1] if len(sys.argv) > 1 else "data/feed.json")
    feed = json.loads(path.read_text(encoding="utf-8-sig"))
    candidates = [i for i, item in enumerate(feed["items"]) if needs_translation(item)]
    if not candidates:
        print("Algorithm summaries: no untranslated English summaries.")
        return
    from transformers import MarianMTModel, MarianTokenizer
    import torch
    torch.set_num_threads(min(4, os.cpu_count() or 2))
    tokenizer = MarianTokenizer.from_pretrained(MODEL, revision=REVISION)
    model = MarianMTModel.from_pretrained(MODEL, revision=REVISION).eval()
    translated = 0
    failed = 0
    for index in candidates:
        item = feed["items"][index]
        try:
            inputs = tokenizer(item["summary"], return_tensors="pt", truncation=False)
            if inputs["input_ids"].shape[-1] > 480:
                raise ValueError("Source summary exceeds the translation input limit")
            with torch.inference_mode():
                output = model.generate(**inputs, max_new_tokens=384, num_beams=4)
            summary = tokenizer.decode(output[0], skip_special_tokens=True)
            feed["items"][index] = apply_translation(item, summary)
            translated += 1
        except Exception as error:
            failed += 1
            print(f"::warning::Algorithm summary kept in original language: {type(error).__name__}")
    pending = sum(needs_translation(item) for item in feed["items"])
    feed["algorithmTranslation"] = {"translated": translated, "pending": pending, "model": MODEL}
    temporary = path.with_suffix(".translation.tmp")
    temporary.write_text(json.dumps(feed, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)
    print(json.dumps({"algorithmSummariesTranslated": translated, "pending": pending, "failed": failed}))


if __name__ == "__main__":
    main()
