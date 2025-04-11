import { configDotenv } from "dotenv";
import fs from "fs";
import { Octokit } from "octokit";
import path from "path";

configDotenv();

// Create a personal access token at https://github.com/settings/tokens/new?scopes=repo

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

const OWNER = "bitrockteam"; // Cambia con il tuo
const REPO = "bitrock-center"; // Cambia con il tuo

// 🧮 Punteggi configurabili
const SCORE_RULES = {
  pr_opened: 5,
  pr_merged: 10,
  review: 3,
  commit: 2,
  issue: 1,
  docs: 4,
};

async function getPullRequests() {
  return await octokit.paginate(octokit.rest.pulls.list, {
    owner: OWNER,
    repo: REPO,
    state: "all",
    per_page: 100,
  });
}

async function getReviews(pullNumber) {
  const { data } = await octokit.rest.pulls.listReviews({
    owner: OWNER,
    repo: REPO,
    pull_number: pullNumber,
  });
  return data;
}

async function getCommits() {
  return await octokit.paginate(octokit.rest.repos.listCommits, {
    owner: OWNER,
    repo: REPO,
    per_page: 100,
  });
}

async function getIssues() {
  return await octokit.paginate(octokit.rest.issues.listForRepo, {
    owner: OWNER,
    repo: REPO,
    state: "all",
    per_page: 100,
  });
}

async function getFilesChanged(pullNumber) {
  const { data } = await octokit.rest.pulls.listFiles({
    owner: OWNER,
    repo: REPO,
    pull_number: pullNumber,
  });
  return data.map((file) => file.filename);
}

function increment(scores, user, type, amount = 1) {
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

async function main() {
  const scores = {};

  console.log("🔍 Pull Request...");
  const prs = await getPullRequests();

  for (const pr of prs) {
    const author = pr.user?.login;
    increment(scores, author, "pr_opened");
    if (pr.merged_at) increment(scores, author, "pr_merged");

    const reviews = await getReviews(pr.number);
    for (const review of reviews) {
      if (review.user?.login !== author) {
        increment(scores, review.user?.login, "review");
      }
    }

    const files = await getFilesChanged(pr.number);
    const isDoc = files.some((f) => f.endsWith(".md") || f.startsWith("docs/"));
    if (isDoc) increment(scores, author, "docs");
  }

  console.log("📦 Commit...");
  const commits = await getCommits();
  for (const commit of commits) {
    const author = commit.author?.login;
    increment(scores, author, "commit");

    const files = await octokit.rest.repos
      .getCommit({
        owner: OWNER,
        repo: REPO,
        ref: commit.sha,
      })
      .then((res) => res.data.files || []);

    const docFiles = files.filter(
      (f) => f.filename.endsWith(".md") || f.filename.startsWith("docs/")
    );
    if (docFiles.length > 0) {
      increment(scores, author, "docs");
    }
  }

  console.log("🐛 Issues...");
  const issues = await getIssues();
  for (const issue of issues) {
    // esclude le PR (GitHub le mostra tra le issue)
    if (!issue.pull_request) {
      increment(scores, issue.user?.login, "issue");
    }
  }

  // 🧮 Calcolo punteggi
  console.log("\n📊 Risultati:");
  Object.entries(scores).forEach(([user, data]) => {
    const totalScore = Object.entries(data).reduce(
      (sum, [key, val]) => sum + val * SCORE_RULES[key],
      0
    );

    console.log(`${user} → ${JSON.stringify(data)} ⇒ 🏆 Score: ${totalScore}`);
  });

  // Scrivi il punteggio in un file Markdown
  writeScoreboard(scores);
  // Scrivi il punteggio in un file JSON
  writeJSON(scores);
  // Crea i badge SVG
  createBadges(scores);
}

function writeScoreboard(scores) {
  const lines = [
    "# 🏆 Contributors Scoreboard\n",
    "| Contributor | PR Opened | PR Merged | Reviews | Commits | Issues | Docs | Total Score |",
    "|-------------|-----------|-----------|---------|---------|--------|------|--------------|",
  ];

  const sorted = Object.entries(scores)
    .map(([user, data]) => {
      const totalScore = Object.entries(data).reduce(
        (sum, [key, val]) => sum + val * SCORE_RULES[key],
        0
      );
      return { user, ...data, totalScore };
    })
    .sort((a, b) => b.totalScore - a.totalScore);

  for (const s of sorted) {
    lines.push(
      `| ${s.user} | ${s.pr_opened} | ${s.pr_merged} | ${s.review} | ${s.commit} | ${s.issue} | ${s.docs} | ${s.totalScore} |`
    );
  }

  fs.writeFileSync("CONTRIBUTORS_SCOREBOARD.md", lines.join("\n"));
  console.log("\n✅ File CONTRIBUTORS_SCOREBOARD.md aggiornato!");
}

function writeJSON(scores) {
  const sorted = Object.entries(scores)
    .map(([user, data]) => {
      const totalScore = Object.entries(data).reduce(
        (sum, [key, val]) => sum + val * SCORE_RULES[key],
        0
      );
      return { user, ...data, totalScore };
    })
    .sort((a, b) => b.totalScore - a.totalScore);

  fs.writeFileSync(
    "dashboard/scoreboard.json",
    JSON.stringify(sorted, null, 2)
  );
  console.log("✅ scoreboard.json aggiornato");
}

function generateBadge(username, score) {
  const color = score >= 100 ? "green" : score >= 50 ? "orange" : "gray";

  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="200" height="20">
    <linearGradient id="g" x2="0" y2="100%">
      <stop offset="0%" stop-color="#fff" stop-opacity=".1"/>
      <stop offset="1%" stop-opacity=".1"/>
    </linearGradient>
    <rect rx="3" width="200" height="20" fill="#555"/>
    <rect rx="3" x="80" width="120" height="20" fill="${color}"/>
    <path fill="${color}" d="M80 0h4v20h-4z"/>
    <rect rx="3" width="200" height="20" fill="url(#g)"/>
    <g fill="#fff" text-anchor="middle"
       font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
      <text x="40" y="14">🏅 ${username}</text>
      <text x="140" y="14">${score} pts</text>
    </g>
  </svg>`.trim();
}

function createBadges(scores) {
  // Genera badge SVG
  const outputDir = "badges";
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

  Object.entries(scores).forEach(([user, data]) => {
    const total = Object.entries(data).reduce(
      (sum, [key, val]) => sum + val * SCORE_RULES[key],
      0
    );
    const badge = generateBadge(user, total);
    fs.writeFileSync(path.join(outputDir, `${user}.svg`), badge);
  });

  console.log("🏅 Badge SVG generati in /badges");
}

main().catch(console.error);
