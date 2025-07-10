import pandas as pd
import json

# Load Excel file
df = pd.read_excel("lingq_terms.xlsx")

# Optional: drop rows with missing data
df = df.dropna(subset=["term", "status"])

# Convert to dictionary: { term: status }
terms_dict = dict(zip(df["term"], df["status"]))

# Save as JSON file
with open("lingq_terms.json", "w", encoding="utf-8") as f:
    json.dump(terms_dict, f, ensure_ascii=False, indent=2)

print("✅ Exported to lingq_terms.json")
