# test_example.py
from scoring import compute_complexity_score

file = {
    "filename": "src/components/Button.tsx",
    "patch": """
+export function Button({ label }) {
+  if (!label) return null;
+  return <button>{label}</button>;
+}
"""
}

score = compute_complexity_score(file)
print(f"Score: {score}")
