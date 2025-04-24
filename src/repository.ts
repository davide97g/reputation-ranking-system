import { Octokit } from "octokit";
import { CommitData, Stats } from "./types";

// Create an instance of Octokit with the token
let octokit: Octokit | null = null;

export function initOctokit(token?: string) {
  octokit = new Octokit({ auth: token });
}

export async function getPullRequests(owner: string, repo: string) {
  return await octokit.paginate(octokit.rest.pulls.list, {
    owner,
    repo,
    state: "all",
    per_page: 100,
  });
}

export async function getReviews(
  owner: string,
  repo: string,
  pullNumber: string,
) {
  const { data } = await octokit.rest.pulls.listReviews({
    owner,
    repo,
    pull_number: pullNumber,
  });
  return data;
}

export async function getCommits(owner: string, repo: string) {
  return await octokit.paginate(octokit.rest.repos.listCommits, {
    owner,
    repo,
    per_page: 100,
  });
}

export async function getIssues(owner: string, repo: string) {
  return await octokit.paginate(octokit.rest.issues.listForRepo, {
    owner,
    repo,
    state: "all",
    per_page: 100,
  });
}

export async function getFilesChanged(
  owner: string,
  repo: string,
  pullNumber: string,
) {
  const { data } = await octokit.rest.pulls.listFiles({
    owner,
    repo,
    pull_number: pullNumber,
  });
  return data.map((file: any) => file.filename);
}

export async function getFilesChangedFromCommit(
  owner: string,
  repo: string,
  commit: any,
) {
  if (!octokit) {
    throw new Error("Octokit is not initialized");
  }
  return await octokit.rest.repos
    .getCommit({
      owner,
      repo,
      ref: commit.sha,
    })
    .then((res: any) => res.data.files || []);
}

export async function getAdditionsAndDeletionsForContributor(
  commit: CommitData,
) {
  const commitInfo: Stats = await fetch(commit.url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    },
  }).then((res) => res.json());

  return {
    additions: commitInfo.stats.additions ?? 0,
    deletions: commitInfo.stats.deletions ?? 0,
  };
}
