import os
import subprocess

from dotenv import load_dotenv
import requests

from scoring import compute_complexity_score

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




def get_modified_files(pr_number):
    url = f"https://api.github.com/repos/{OWNER}/{REPO}/pulls/{pr_number}/files"
    res = requests.get(url, headers=HEADERS)
    return res.json()

def calculate_pr_score(pr_number):
    files = get_modified_files(pr_number)
    if not files:
        return 0

    total_score = 0
    for file in files:
        # Qui possiamo recuperare il diff di ogni file
        diff = subprocess.run(
            ["git", "diff", "origin/main", "--", file],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        ).stdout.decode()

        file_data = {
            "filename": file,
            "patch": diff
        }

        score = compute_complexity_score(file_data)
        total_score += score
        print(f"File: {file}, Score: {score}")

    return total_score

if __name__ == "__main__":
    pr_number = os.getenv("PR_NUMBER")  # Prendere il numero PR da variabili d'ambiente
    if pr_number:
        score = calculate_pr_score(pr_number)
        # comment_on_pr(pr_number, score)
        print(f"Total PR Score: {score}")
    else:
        print("Numero PR non specificato.")
