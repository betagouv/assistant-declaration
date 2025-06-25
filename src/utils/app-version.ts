import { Octokit } from '@octokit/rest';
import gitRevision from 'git-rev-sync';
import parseGithubUrl from 'parse-github-url';

// For whatever reason when using TypeScript version of `next.config.ts`
// it has to be a relative path otherwise it says `MODULE_NOT_FOUND`...
import { workaroundAssert as assert } from './assert';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN || undefined, // If not specified it uses public shared quota based on IP
});

export function getRepositoryInformation() {
  // TODO: it appears when using `npm` the `process.env.npm_package_repository_url` variable won't be set
  // so using a fallback instead...
  const repoInfo = parseGithubUrl(process.env.npm_package_repository_url || 'https://github.com/betagouv/assistant-declaration');

  if (!repoInfo) {
    throw new Error(`"parseGithubUrl()" has returned nothing`);
  }

  return repoInfo;
}

export function getFallbackCommitSha() {
  // Heroku/Scalingo remove the `.git` folder so during the build time we are unable to use `git-rev-sync`
  // we work around this by doing GET requests since they at least provide `$SOURCE_VERSION` that equals the commit SHA
  // during the build phase, and `$CONTAINER_VERSION` during the runtime phase (that should be most of the time the commit SHA).
  let commitSha = process.env.SOURCE_VERSION || process.env.CONTAINER_VERSION;
  if (commitSha === undefined) {
    throw new Error('`$SOURCE_VERSION` or `$CONTAINER_VERSION` environment variable must be provided to use the fallback');
  }

  return commitSha;
}

export function getCommitSha() {
  let commitSha;
  try {
    commitSha = gitRevision.long();
  } catch (err) {
    commitSha = getFallbackCommitSha();
  }

  return commitSha;
}

export async function getFallbackCommitInformation() {
  const commitSha = getFallbackCommitSha();
  const repoInfo = getRepositoryInformation();

  assert(repoInfo.owner);
  assert(repoInfo.name);

  const result = await octokit.rest.repos.getCommit({
    owner: repoInfo.owner,
    repo: repoInfo.name,
    ref: commitSha,
  });

  return result.data;
}

export async function getFallbackCommitTag() {
  const commitSha = getFallbackCommitSha();
  const repoInfo = getRepositoryInformation();

  assert(repoInfo.owner);
  assert(repoInfo.name);

  const result = await octokit.rest.repos.listTags({
    owner: repoInfo.owner,
    repo: repoInfo.name,
    per_page: 100, // Maximum to not miss the right tag... for now we don't browse pages if more than one
  });

  for (const tagInfo of result.data) {
    if (tagInfo.commit.sha === commitSha) {
      return tagInfo.name;
    }
  }

  // As fallback otherwise
  // Note: it's possible
  return commitSha;
}

export async function getCommitTag() {
  let tag;
  try {
    tag = gitRevision.tag();
  } catch (err) {
    tag = await getFallbackCommitTag();
  }

  return tag;
}

export async function getGitRevisionDate() {
  let date;
  try {
    date = gitRevision.date();
  } catch (err) {
    const commitInfo = await getFallbackCommitInformation();

    assert(commitInfo.commit.author?.date);

    date = new Date(commitInfo.commit.author.date);
  }

  return date.toISOString().split('.')[0].replace(/\D/g, ''); // Remove milliseconds and keep only digits
}

export async function getHumanVersion() {
  const commitSha = getCommitSha();
  const tag = await getCommitTag();

  // If no commit tag, use the technical version since it's not a production deployment
  if (tag === commitSha) {
    return await getTechnicalVersion();
  } else {
    return tag;
  }
}

export async function getTechnicalVersion() {
  const commitSha = getCommitSha();
  const revisionDate = await getGitRevisionDate();

  return `v${process.env.npm_package_version}-${revisionDate}-${commitSha.substring(0, 12)}`;
}
