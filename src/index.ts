import { Octokit } from "octokit";

// 🧮 Punteggi configurabili
const SCORE_RULES = {
  pr_opened: 5,
  pr_merged: 10,
  review: 3,
  commit: 2,
  issue: 1,
  docs: 4,
};

async function getPullRequests(owner: string, repo: string, octokit: any) {
  return await octokit.paginate(octokit.rest.pulls.list, {
    owner,
    repo,
    state: "all",
    per_page: 100,
  });
}

async function getReviews(
  owner: string,
  repo: string,
  pullNumber: string,
  octokit: any,
) {
  const { data } = await octokit.rest.pulls.listReviews({
    owner,
    repo,
    pull_number: pullNumber,
  });
  return data;
}

async function getCommits(owner: string, repo: string, octokit: any) {
  return await octokit.paginate(octokit.rest.repos.listCommits, {
    owner,
    repo,
    per_page: 100,
  });
}

async function getIssues(owner: string, repo: string, octokit: any) {
  return await octokit.paginate(octokit.rest.issues.listForRepo, {
    owner,
    repo,
    state: "all",
    per_page: 100,
  });
}

async function getFilesChanged(
  owner: string,
  repo: string,
  pullNumber: string,
  octokit: any,
) {
  const { data } = await octokit.rest.pulls.listFiles({
    owner,
    repo,
    pull_number: pullNumber,
  });
  return data.map((file: any) => file.filename);
}

function increment(scores: any, user: string, type: string, amount = 1) {
  if (!user) return;
  if (!scores[user]) {
    scores[user] = {
      pr_opened: 0,
      pr_merged: 0,
      review: 0,
      commit: 0,
      issue: 0,
      docs: 0,
    };
  }
  scores[user][type] += amount;
}

/**
 *
 * Compute the reputation scoring for a GitHub repository.
 *
 */
export async function computeReputationScoring({
  owner,
  repo,
  token,
}: {
  owner: string;
  repo: string;
  token?: string;
}) {
  // Create an instance of Octokit with the token
  const octokit = new Octokit({ auth: token });

  const scores = {};

  console.log("🔍 Pull Request...");
  const prs = await getPullRequests(owner, repo, octokit);

  for (const pr of prs) {
    const author = pr.user?.login;
    increment(scores, author, "pr_opened");
    if (pr.merged_at) increment(scores, author, "pr_merged");

    const reviews = await getReviews(owner, repo, pr.number, octokit);
    for (const review of reviews) {
      if (review.user?.login !== author) {
        increment(scores, review.user?.login, "review");
      }
    }

    const files = await getFilesChanged(owner, repo, pr.number, octokit);
    const isDoc = files.some(
      (f: string) => f.endsWith(".md") || f.startsWith("docs/"),
    );
    if (isDoc) increment(scores, author, "docs");
  }

  console.log("📦 Commit...");
  const commits = await getCommits(owner, repo, octokit);
  for (const commit of commits) {
    const author = commit.author?.login;
    increment(scores, author, "commit");

    const files = await octokit.rest.repos
      .getCommit({
        owner,
        repo,
        ref: commit.sha,
      })
      .then((res: any) => res.data.files || []);

    const docFiles = files.filter(
      (f: any) => f.filename.endsWith(".md") || f.filename.startsWith("docs/"),
    );
    if (docFiles.length > 0) {
      increment(scores, author, "docs");
    }
  }

  console.log("🐛 Issues...");
  const issues = await getIssues(owner, repo, octokit);
  for (const issue of issues) {
    // esclude le PR (GitHub le mostra tra le issue)
    if (!issue.pull_request) {
      increment(scores, issue.user?.login, "issue");
    }
  }

  // 🧮 Calcolo punteggi
  console.log("\n📊 Risultati:");
  const userScores: {
    user: string;
    score: number;
  }[] = [];
  Object.entries(scores).forEach(([user, data]) => {
    const totalScore = Object.entries(data as any).reduce(
      (sum, [key, val]) => sum + (val as any) * (SCORE_RULES as any)[key],
      0,
    );

    console.log(`${user} → ${JSON.stringify(data)} ⇒ 🏆 Score: ${totalScore}`);
    userScores.push({ user, score: totalScore });
  });

  return {
    userScores,
    stats: {
      totalPullRequests: prs.length,
      totalCommits: commits.length,
      totalIssues: issues.length,
    },
  };

  // Scrivi il punteggio in un file Markdown
  // writeScoreboard(scores);
  // Scrivi il punteggio in un file JSON
  // writeJSON(scores);
}
