export interface User {
  name: string;
  email: string;
  login?: string;
  id?: number;
  node_id?: string;
  avatar_url?: string;
  gravatar_id?: string;
  url?: string;
  html_url?: string;
  followers_url?: string;
  following_url?: string;
  gists_url?: string;
  starred_url?: string;
  subscriptions_url?: string;
  organizations_url?: string;
  repos_url?: string;
  events_url?: string;
  received_events_url?: string;
  type?: string;
  user_view_type?: string;
  site_admin?: boolean;
}

export interface CommitData {
  sha: string;
  node_id: string;
  commit: {
    author: User;
    committer: User;
    message: string;
    tree: {
      sha: string;
      url: string;
    };
    url: string;
    comment_count: number;
    verification: {
      verified: boolean;
      reason: string;
      signature: string | null;
      payload: string | null;
      verified_at: string | null;
    };
  };
  url: string;
  html_url: string;
  comments_url: string;
  author: User;
  committer: User;
  parents: {
    sha: string;
    url: string;
    html_url: string;
  }[];
}

export interface Stats {
  stats: {
    total: number;
    additions: number;
    deletions: number;
  };
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
