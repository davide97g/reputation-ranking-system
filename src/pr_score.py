import os
import subprocess
import json
from scoring import compute_complexity_score

from github import Github
import os

def comment_on_pr(pr_number, score):
    token = os.getenv('GITHUB_TOKEN')
    g = Github(token)
    repo = g.get_repo(os.getenv('GITHUB_REPOSITORY'))
    pr = repo.get_pull(pr_number)
    pr.create_issue_comment(f"🔢 **PR Complexity Score**: {score}")

def get_modified_files(pr_number):
    # Usa l'API di GitHub per ottenere i file modificati nella PR
    try:
        result = subprocess.run(
            ["gh", "pr", "view", str(pr_number), "--json", "files", "--jq", ".files[].path"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=True
        )
        files = result.stdout.decode().strip().split("\n")
        return files
    except subprocess.CalledProcessError as e:
        print(f"Errore nell'ottenere i file modificati: {e.stderr.decode()}")
        return []

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
        comment_on_pr(pr_number, score)
        print(f"Total PR Score: {score}")
    else:
        print("Numero PR non specificato.")
