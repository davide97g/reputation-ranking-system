from dotenv import load_dotenv
import requests
from collections import defaultdict
import ast
import os

from scoring import compute_complexity_score

# read from environment variables

# Carica le variabili d'ambiente dal file .env
load_dotenv()


# === CONFIGURAZIONE ===
OWNER = os.environ.get("GITHUB_OWNER",'bitrockteam') 
REPO = os.environ.get("GITHUB_REPO",'bitrock-center')  # Nome del repository
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN")  # Token di accesso personale

print(f"OWNER: {OWNER}")
print(f"REPO: {REPO}")
print(f"GITHUB_TOKEN: {GITHUB_TOKEN}")

HEADERS = {
    "Accept": "application/vnd.github.v3+json",
    "Authorization": f"token {GITHUB_TOKEN}" if GITHUB_TOKEN else ""
}

# === UTILS ===

def fetch_all_prs():
    prs = []
    page = 1
    while True:
        url = f"https://api.github.com/repos/{OWNER}/{REPO}/pulls?state=closed&per_page=100&page={page}"
        res = requests.get(url, headers=HEADERS)
        data = res.json()
        if not data or "message" in data:
            break
        prs.extend([pr for pr in data if pr.get("merged_at")])
        page += 1
    return prs

def fetch_pr_files(pr_number):
    url = f"https://api.github.com/repos/{OWNER}/{REPO}/pulls/{pr_number}/files"
    res = requests.get(url, headers=HEADERS)
    return res.json()

def is_test_file(filename):
    return "test" in filename.lower() or filename.endswith(("_spec.js", "_test.py"))

def is_doc_file(filename):
    return filename.lower().endswith((".md", ".rst")) or "docs" in filename.lower()

# === ANALISI DELLA COMPLESSITÀ ===

def compute_ast_complexity(patch):
    """
    Valuta la complessità di una patch Python usando AST:
    - Numero di classi
    - Numero di funzioni
    - Numero di blocchi condizionali (if, for, while, try)
    """
    added_code = "\n".join(
        line[1:] for line in patch.splitlines()
        if line.startswith("+") and not line.startswith("+++")
    )
    try:
        tree = ast.parse(added_code)
    except SyntaxError:
        return 0  # codice incompleto → non parsabile

    class ASTComplexityCounter(ast.NodeVisitor):
        def __init__(self):
            self.classes = 0
            self.functions = 0
            self.conditionals = 0

        def visit_ClassDef(self, node):
            self.classes += 1
            self.generic_visit(node)

        def visit_FunctionDef(self, node):
            self.functions += 1
            self.generic_visit(node)

        def visit_If(self, node): self.conditionals += 1
        def visit_For(self, node): self.conditionals += 1
        def visit_While(self, node): self.conditionals += 1
        def visit_Try(self, node): self.conditionals += 1

    counter = ASTComplexityCounter()
    counter.visit(tree)

    return counter.classes * 2 + counter.functions * 1.5 + counter.conditionals * 1.2

def compute_pr_score(files):
    additions = sum(f["additions"] for f in files)
    deletions = sum(f["deletions"] for f in files)
    file_count = len(files)

    score = additions * 0.5 + deletions * 0.3

    if any(is_test_file(f["filename"]) for f in files):
        score += 1
    if any(is_doc_file(f["filename"]) for f in files):
        score += 1
    if file_count >= 5:
        score += 2

    for f in files:
        score += compute_complexity_score(f)

    return round(score, 2)

# === MAIN ===

def calculate_contributor_scores():
    scores = defaultdict(float)
    prs = fetch_all_prs()
    print(f"✅ Trovate {len(prs)} PR mergeate.")

    for pr in prs:
        user = pr["user"]["login"]
        pr_number = pr["number"]
        files = fetch_pr_files(pr_number)
        pr_score = compute_pr_score(files)
        scores[user] += pr_score
        print(f"PR #{pr_number} di {user}: {pr_score} punti")

    return scores

if __name__ == "__main__":
    print(f"\n📊 Calcolo impatto PR + complessità AST per {OWNER}/{REPO}...\n")
    final_scores = calculate_contributor_scores()
    print("\n🏆 Classifica Contributor per Impatto:\n")
    for user, score in sorted(final_scores.items(), key=lambda x: x[1], reverse=True):
        print(f"{user}: {round(score, 2)} punti")
