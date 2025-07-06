import json
import pandas as pd

# Load JSON data
with open('lingqs.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Extract term and status
rows = [{'term': entry['term'], 'status': entry['status']} for entry in data]

# Create DataFrame
df = pd.DataFrame(rows)

# Save to Excel (or use .to_csv for CSV)
df.to_excel('lingq_terms.xlsx', index=False)

print("Exported to lingq_terms.xlsx")
