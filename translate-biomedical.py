"""Translate biomedical display titles and summaries without changing source records."""
import json
import os
import re
import sys
from pathlib import Path

MODEL = "Helsinki-NLP/opus-mt-en-zh"
REVISION = "408d9bc410a388e1d9aef112a2daba955b945255"


def source_text(item):
    return item.get("originalTitle") or item["title"], item.get("originalSummary") or item["summary"]


def needs_translation(item):
    if not item.get("biomedicalTopics"):
        return False
    title, summary = source_text(item)
    cached = item.get("biomedicalTranslation", {})
    return not (cached.get("sourceTitle") == title and cached.get("sourceSummary") == summary
                and cached.get("title") and cached.get("summary"))


def is_chinese(text):
    return bool(re.search(r"[\u4e00-\u9fff]", text))


def apply_translation(item, title, summary):
    if not all(isinstance(s, str) and is_chinese(s) for s in (title, summary)):
        raise ValueError("Chinese title and summary are required")
    if len(title) > 700 or len(summary) > 2000:
        raise ValueError("Translation too long")
    source_title, source_summary = source_text(item)
    return {**item, "biomedicalTranslation": {
        "title": title.strip(), "summary": summary.strip(),
        "sourceTitle": source_title, "sourceSummary": source_summary,
        "method": "opus-mt-en-zh"}}


def main():
    path = Path(sys.argv[1] if len(sys.argv) > 1 else "data/feed.json")
    feed = json.loads(path.read_text(encoding="utf-8-sig"))
    candidates = [i for i, item in enumerate(feed["items"]) if needs_translation(item)]
    if not candidates:
        print("Biomedical titles and summaries: up to date.")
        return
    from transformers import MarianMTModel, MarianTokenizer
    import torch
    torch.set_num_threads(min(4, os.cpu_count() or 2))
    tokenizer = MarianTokenizer.from_pretrained(MODEL, revision=REVISION)
    model = MarianMTModel.from_pretrained(MODEL, revision=REVISION).eval()

    def translate(text):
        if is_chinese(text):
            return text
        inputs = tokenizer(text, return_tensors="pt", truncation=False)
        if inputs["input_ids"].shape[-1] > 480:
            # Translate complete sentence chunks rather than silently truncating.
            parts = re.split(r"(?<=[.!?;])\s+", text)
            if len(parts) < 2:
                raise ValueError("Source exceeds translation input limit")
            return " ".join(translate(part) for part in parts if part)
        with torch.inference_mode():
            output = model.generate(**inputs, max_new_tokens=512, num_beams=4)
        result = tokenizer.decode(output[0], skip_special_tokens=True)
        for old, new in [("粮食和药物管理局", "美国食品药品监督管理局"),
                         ("粮食及药物管理局", "美国食品药品监督管理局"),
                         ("食品和药品管理局", "美国食品药品监督管理局")]:
            result = result.replace(old, new)
        return result

    translated = failed = 0
    for index in candidates:
        item = feed["items"][index]
        try:
            feed["items"][index] = apply_translation(item, translate(item["title"]), translate(item["summary"]))
            translated += 1
        except Exception as error:
            failed += 1
            print(f"::warning::Biomedical translation pending: {type(error).__name__}")
    pending = sum(needs_translation(item) for item in feed["items"])
    feed["biomedicalTranslationStatus"] = {"translated": translated, "pending": pending, "failed": failed, "model": MODEL}
    temporary = path.with_suffix(".biomedical.tmp")
    temporary.write_text(json.dumps(feed, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)
    print(json.dumps(feed["biomedicalTranslationStatus"]))


if __name__ == "__main__":
    main()
