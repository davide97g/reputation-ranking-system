/**
 * THIS IS A TEST FILE
 * This file is used to test the computeReputationScoring function.
 * It is not intended to be used in production.
 * It is used to test the function in a local environment.
 * It is not intended to be used in a CI/CD pipeline.
 * Please do not delete this file.
 * If you need to apply any changes to the function, please add comments and explanations.
 */

import dotenv from "dotenv";
import { computeReputationScoring } from "./dist/index.js";
dotenv.config();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO = process.env.GITHUB_REPO;
const PR_NUMBER = process.env.PR_NUMBER;

console.log("GITHUB_TOKEN", GITHUB_TOKEN);
console.log("GITHUB_OWNER", GITHUB_OWNER);
console.log("GITHUB_REPO", GITHUB_REPO);
console.log("PR_NUMBER", PR_NUMBER);

computeReputationScoring({
  token: GITHUB_TOKEN,
  owner: GITHUB_OWNER,
  repo: GITHUB_REPO,
  prNumber: PR_NUMBER,
})
  .then((result) => {
    console.log("Result", result);
  })
  .catch((error) => {
    console.error("Error", error);
  });
