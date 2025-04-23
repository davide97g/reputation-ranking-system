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
      const mockCommits = [{ author: { login: "user3" } }];
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
        { user: "user1", score: 19 }, // pr_opened (5) + pr_merged (10) + docs (4)
        { user: "user2", score: 3 }, // review (3)
        { user: "user3", score: 6 }, // commit (2) + docs (4)
        { user: "user4", score: 1 }, // issue (1)
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
      expect(getIssues).toHaveBeenCalledWith("test-owner", "test-repo");
    });
  });
});
