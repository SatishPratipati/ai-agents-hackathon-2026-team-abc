import pandas as pd
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

normalization_df = pd.read_csv(
    BASE_DIR / "datasets" / "normalization.csv"
)

print(normalization_df.columns.tolist())

intent_df = pd.read_csv(
    BASE_DIR / "datasets" / "intent.csv"
)

print("INTENT COLUMNS:")
print(intent_df.columns)

print(intent_df.head())

translation_df = pd.read_csv(
    BASE_DIR / "datasets" / "translation.csv"
)

normalization_df = pd.read_csv(
    BASE_DIR / "datasets" / "normalization.csv"
)

print("NORMALIZATION COLUMNS:")
print(normalization_df.columns)

print("FIRST 5 ROWS:")
print(normalization_df.head())

def find_normalization(text: str):
    match = normalization_df[
        normalization_df["input_text"].astype(str).str.strip() == text.strip()
    ]

    if len(match) > 0:
        row = match.iloc[0]

        return {
            "dialect": row["dialect_tag"],
            "input_type": row["input_type"],
            "telugu_script": row["telugu_script"],
            "normalized_telugu": row["normalized_telugu"]
        }

    return None


def find_normalization(text: str):

    match = normalization_df[
        normalization_df["input_text"].astype(str).str.strip()
        == text.strip()
    ]

    if len(match) > 0:

        row = match.iloc[0]

        return {
            "dialect": row["dialect_tag"],
            "input_type": row["input_type"],
            "telugu_script": row["telugu_script"],
            "normalized_telugu": row["normalized_telugu"]
        }

    return None


def find_intent(text: str):
    match = intent_df[
        intent_df["text"].astype(str).str.strip() == text.strip()
    ]

    if len(match) > 0:
        return match.iloc[0]["intent"]

    return None


def find_translation(text: str):
    match = translation_df[
        translation_df["text"].astype(str).str.strip() == text.strip()
    ]

    if len(match) > 0:
        row = match.iloc[0]

        return {
            "en": row["english"],
            "ta": row["tamil"],
            "ta_romanized": row["tamil_romanized"]
        }

    return None