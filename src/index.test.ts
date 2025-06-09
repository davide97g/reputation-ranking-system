import { computeReputationScoring, increment } from "./index";
import {
  getCommits,
  getFilesChanged,
  getFilesChangedFromCommit,
  getIssues,
  getPullRequests,
  getReviews,
  initOctokit,
} from "./repository";
import { getAdditionsAndDeletionsForContributor } from "./utils";

// mock octokit
jest.mock("octokit", () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    paginate: jest.fn((method: any, { owner, repo }: any) => {
      if (method === "rest.pulls.list") {
        return Promise.resolve({
          data: [
            {
              user: { login: "testUser" },
              merged_at: null,
              number: 1,
            },
          ],
        });
      }
      if (method === "rest.pulls.listReviews") {
        return Promise.resolve({
          data: [
            {
              user: { login: "reviewerUser" },
            },
          ],
        });
      }
    }),
  })),
}));

jest.mock("./repository");
jest.mock("./utils", () => ({
  getAdditionsAndDeletionsForContributor: jest.fn().mockResolvedValue({
    additions: 23,
    deletions: 10,
  }),
}));

global.fetch = jest.fn(
  () =>
    Promise.resolve({
      json: () => Promise.resolve({ stats: { additions: 23, deletions: 10 } }),
    }) as Promise<Response>,
);

describe("Reputation Scoring System", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("increment", () => {
    it("should initialize user scores and increment the specified type", () => {
      const scores: any = {};
      increment(scores, "user1", "pr_opened");
      expect(scores).toEqual({
        user1: {
          pr_opened: 1,
          pr_merged: 0,
          review: 0,
          commit: 0,
          issue: 0,
          docs: 0,
          additions: 0,
          deletions: 0,
        },
      });
    });

    it("should increment the existing score for a user and type", () => {
      const scores: any = {
        user1: {
          pr_opened: 1,
          pr_merged: 0,
          review: 0,
          commit: 0,
          issue: 0,
          docs: 0,
          additions: 0,
          deletions: 0,
        },
      };
      increment(scores, "user1", "pr_opened", 2);
      expect(scores.user1.pr_opened).toBe(3);
    });

    it("should do nothing if user is not provided", () => {
      const scores: any = {};
      increment(scores, "", "pr_opened");
      expect(scores).toEqual({});
    });
  });

  describe("computeReputationScoring", () => {
    it("should compute scores based on repository data", async () => {
      const mockPullRequests = [
        {
          user: { login: "user1" },
          merged_at: "2023-01-01T00:00:00Z",
          number: 1,
        },
      ];
      const mockReviews = [{ user: { login: "user2" } }];
      const mockCommits = [
        {
          sha: "sha123",
          node_id: "node456",
          url: "https://mockurl.com",
          html_url: "",
          comments_url: "",
          author: {
            login: "user3",
            name: "User Three",
            email: "user3@test.com",
          },
          committer: { login: "user3" },
          commit: {
            author: { name: "User Three", email: "user3@test.com" },
            committer: { name: "User Three", email: "user3@test.com" },
            message: "test commit",
            tree: { sha: "tree123", url: "https://tree.url" },
            url: "https://mockurl.com",
            comment_count: 0,
            verification: {
              verified: false,
              reason: "",
              signature: null,
              payload: null,
              verified_at: null,
            },
          },
          parents: [],
        },
      ];
      const mockFilesChanged = ["docs/readme.md"];
      const mockFilesChangedFromCommit = [{ filename: "docs/changelog.md" }];
      const mockIssues = [{ user: { login: "user4" } }];

      (initOctokit as jest.Mock).mockImplementation(() => {});
      (getPullRequests as jest.Mock).mockResolvedValue(mockPullRequests);
      (getReviews as jest.Mock).mockResolvedValue(mockReviews);
      (getCommits as jest.Mock).mockResolvedValue(mockCommits);
      (getFilesChanged as jest.Mock).mockResolvedValue(mockFilesChanged);
      (getFilesChangedFromCommit as jest.Mock).mockResolvedValue(
        mockFilesChangedFromCommit,
      );
      (getIssues as jest.Mock).mockResolvedValue(mockIssues);

      const result = await computeReputationScoring({
        owner: "test-owner",
        repo: "test-repo",
        token: "test-token",
      });

      expect(result.userScores).toEqual([
        {
          additions: 0,
          commit: 0,
          deletions: 0,
          docs: 1,
          issue: 0,
          pr_merged: 1,
          pr_opened: 1,
          review: 0,
          score: 19,
          user: "user1",
        }, // pr_opened (5) + pr_merged (10) + docs (4)
        {
          user: "user2",
          score: 3,
          additions: 0,
          commit: 0,
          deletions: 0,
          docs: 0,
          issue: 0,
          pr_merged: 0,
          pr_opened: 0,
          review: 1,
        }, // review (3)
        {
          user: "user3",
          score: 6,
          additions: 23,
          commit: 1,
          deletions: 10,
          docs: 1,
          issue: 0,
          pr_merged: 0,
          pr_opened: 0,
          review: 0,
        }, // commit (2) + docs (4)
        {
          user: "user4",
          score: 1,
          additions: 0,
          commit: 0,
          deletions: 0,
          docs: 0,
          issue: 1,
          pr_merged: 0,
          pr_opened: 0,
          review: 0,
        }, // issue (1)
      ]);

      expect(result.stats).toEqual({
        totalPullRequests: 1,
        totalCommits: 1,
        totalIssues: 1,
      });

      expect(initOctokit).toHaveBeenCalledWith("test-token");
      expect(getPullRequests).toHaveBeenCalledWith("test-owner", "test-repo");
      expect(getReviews).toHaveBeenCalledWith("test-owner", "test-repo", 1);
      expect(getCommits).toHaveBeenCalledWith("test-owner", "test-repo");
      expect(getFilesChanged).toHaveBeenCalledWith(
        "test-owner",
        "test-repo",
        1,
      );
      expect(getFilesChangedFromCommit).toHaveBeenCalledWith(
        "test-owner",
        "test-repo",
        mockCommits[0],
      );
      expect(getAdditionsAndDeletionsForContributor).toHaveBeenCalledWith(
        mockCommits[0],
        "test-token",
      );
      expect(getIssues).toHaveBeenCalledWith("test-owner", "test-repo");
    });
  });
});
