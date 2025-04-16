from dotenv import load_dotenv
import requests
from collections import defaultdict
from github import Github
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
print(f"GITHUB_TOKEN: {'✅' if GITHUB_TOKEN else '❌'}")

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

def fetch_pr(pr_number):
    url = f"https://api.github.com/repos/{OWNER}/{REPO}/pulls/{pr_number}"
    res = requests.get(url, headers=HEADERS)
    data = res.json()
    if not data or "message" in data:
        return None
    return data

def fetch_pr_files(pr_number):
    url = f"https://api.github.com/repos/{OWNER}/{REPO}/pulls/{pr_number}/files"
    res = requests.get(url, headers=HEADERS)
    return res.json()

def is_test_file(filename):
    return "test" in filename.lower() or filename.endswith(("_spec.js", "_test.py"))

def is_doc_file(filename):
    return filename.lower().endswith((".md", ".rst")) or "docs" in filename.lower()

# === ANALISI DELLA COMPLESSITÀ ===

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

def calculate_contributor_scores_for_single_pr(pr_number):
    pr = fetch_pr(pr_number)
    if not pr:
        print(f"❌ PR #{pr_number} non trovata.")
        return None
    user = pr["user"]["login"]
    files = fetch_pr_files(pr_number)
    pr_score = compute_pr_score(files)
    print(f"PR #{pr_number} di {user}: {pr_score} punti")
    return (user, pr_score)

def comment_on_pr(pr_number, score):
    token = os.getenv('GITHUB_TOKEN')
    g = Github(token)
    repo = g.get_repo(OWNER+"/"+REPO)
    pr = repo.get_pull(int(pr_number))

    pr.create_issue_comment(f"🔢 **PR Complexity Score**: {score}")

if __name__ == "__main__":

    pr_number = os.getenv("PR_NUMBER")  # Prendere il numero PR da variabili d'ambiente
    if pr_number:
        user,score = calculate_contributor_scores_for_single_pr(pr_number)      
        if(not score):
            print(f"❌ PR #{pr_number} non trovata.")
            exit(1)        
        comment_on_pr(pr_number, score)
        print(f"{user}: {round(score, 2)} punti")
    else:        
        print(f"\n📊 Calcolo impatto PR + complessità AST per {OWNER}/{REPO}...\n")
        final_scores = calculate_contributor_scores()
        print("\n🏆 Classifica Contributor per Impatto:\n")
        for user, score in sorted(final_scores.items(), key=lambda x: x[1], reverse=True):
            print(f"{user}: {round(score, 2)} punti")
