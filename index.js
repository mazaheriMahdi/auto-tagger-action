const { execSync } = require("child_process");
const { getOctokit, context } = require("@actions/github");
const core = require('@actions/core');

(async () => {
  try {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error("Missing GITHUB_TOKEN environment variable.");
    }

    const octokit = getOctokit(token);
    const { owner, repo } = context.repo;

    // Fetch all tags and sort them
    execSync("git fetch --tags");
    const tags = execSync("git tag --list 'v[0-9]*.[0-9]*.[0-9]*' --sort=-v:refname")
      .toString()
      .trim()
      .split("\n");

    // Get the latest tag or default to v0.0.0
    const latestTag = tags[0] || "v0.0.0";
    console.log(`Latest tag: ${latestTag}`);

    // Parse the latest tag
    const [major, minor, patch] = latestTag.slice(1).split(".").map(Number);
    const newTag = `v${major}.${minor}.${patch + 1}`;
    console.log(`New tag: ${newTag}`);

    // Create and push the new tag
    execSync(`git tag ${newTag}`);
    execSync(`git push origin ${newTag}`);

    core.setOutput("tag", newTag)
    console.log(`Tag ${newTag} created and pushed.`);
  } catch (error) {
    console.error("Error incrementing version:", error.message);
    process.exit(1);
  }
})();