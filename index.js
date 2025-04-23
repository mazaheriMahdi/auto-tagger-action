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

    execSync("git fetch --tags");
    const tags = execSync("git tag --list 'v[0-9]*.[0-9]*.[0-9]*' --sort=-v:refname")
      .toString()
      .trim()
      .split("\n");

    const latestTag = tags[0] || "v0.0.0";
    console.log(`Latest tag: ${latestTag}`);

    const [major, minor, patch] = latestTag.slice(1).split(".").map(Number);
    const newTag = `v${major}.${minor}.${patch + 1}`;
    console.log(`New tag: ${newTag}`);


    execSync(`git tag ${newTag}`);
    execSync(`git tag -d latest`);
    execSync(`git tag latest`);
    
    // Delete local and remote 'latest' tags
    execSync(`git tag -d latest`);
    execSync(`git push origin :refs/tags/latest || true`);  // || true prevents failure if tag doesn't exist
    
    // Create and push new 'latest' tag
    execSync(`git tag latest`);
    execSync(`git push origin latest`);

    core.setOutput("tag", newTag)
    execSync(`git push origin --tags`);



    console.log(`Tag ${newTag} created and pushed.`);
    console.log("latest tag moved to latest commit")
  } catch (error) {
    console.error("Error incrementing version:", error.message);
    process.exit(1);
  }
})();
