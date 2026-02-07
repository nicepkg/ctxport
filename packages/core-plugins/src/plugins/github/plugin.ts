import type {
  ContentBundle,
  ContentNode,
  Participant,
} from "@ctxport/core-schema";
import { createAppError } from "@ctxport/core-schema";
import type { Plugin, PluginContext } from "../../types";
import { generateId } from "../../utils";
import {
  githubGraphQL,
  isUserLoggedIn,
  ISSUE_QUERY,
  PR_QUERY,
  type GQLIssueData,
  type GQLPullRequestData,
} from "./graphql";
import type {
  GitHubComment,
  GitHubContentType,
  GitHubIssue,
  GitHubPullRequest,
  GitHubReviewComment,
} from "./types";

const ISSUE_PATTERN =
  /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/;
const PR_PATTERN = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/;

const API_BASE = "https://api.github.com";

export const githubPlugin: Plugin = {
  id: "github",
  version: "1.0.0",
  name: "GitHub",

  urls: {
    hosts: ["https://github.com/*"],
    match: (url) => ISSUE_PATTERN.test(url) || PR_PATTERN.test(url),
  },

  async extract(ctx: PluginContext): Promise<ContentBundle> {
    const parsed = parseGitHubUrl(ctx.url);
    if (!parsed) {
      throw createAppError(
        "E-PARSE-001",
        "Not a GitHub Issue or Pull Request page",
      );
    }
    return fetchAndBuild(
      parsed.owner,
      parsed.repo,
      parsed.number,
      parsed.type,
      ctx.url,
    );
  },

  async fetchById(id: string): Promise<ContentBundle> {
    const parsed = parseGitHubId(id);
    if (!parsed) {
      throw createAppError(
        "E-PARSE-001",
        `Invalid GitHub ID format: ${id}. Expected: owner/repo/issues/123 or owner/repo/pull/123`,
      );
    }
    const url = `https://github.com/${parsed.owner}/${parsed.repo}/${parsed.type === "issue" ? "issues" : "pull"}/${parsed.number}`;
    return fetchAndBuild(
      parsed.owner,
      parsed.repo,
      parsed.number,
      parsed.type,
      url,
    );
  },

  theme: {
    light: {
      primary: "#24292f",
      secondary: "#f6f8fa",
      fg: "#ffffff",
      secondaryFg: "#656d76",
    },
    dark: {
      primary: "#f0f6fc",
      secondary: "#161b22",
      fg: "#0d1117",
      secondaryFg: "#7d8590",
    },
  },
};

// --- Internal: URL / ID parsing ---

interface ParsedGitHub {
  owner: string;
  repo: string;
  number: number;
  type: GitHubContentType;
}

function parseGitHubUrl(url: string): ParsedGitHub | null {
  const issueMatch = ISSUE_PATTERN.exec(url);
  if (issueMatch) {
    return {
      owner: issueMatch[1]!,
      repo: issueMatch[2]!,
      number: Number(issueMatch[3]),
      type: "issue",
    };
  }
  const prMatch = PR_PATTERN.exec(url);
  if (prMatch) {
    return {
      owner: prMatch[1]!,
      repo: prMatch[2]!,
      number: Number(prMatch[3]),
      type: "pull-request",
    };
  }
  return null;
}

function parseGitHubId(id: string): ParsedGitHub | null {
  const issueMatch = /^([^/]+)\/([^/]+)\/issues\/(\d+)$/.exec(id);
  if (issueMatch) {
    return {
      owner: issueMatch[1]!,
      repo: issueMatch[2]!,
      number: Number(issueMatch[3]),
      type: "issue",
    };
  }
  const prMatch = /^([^/]+)\/([^/]+)\/pull\/(\d+)$/.exec(id);
  if (prMatch) {
    return {
      owner: prMatch[1]!,
      repo: prMatch[2]!,
      number: Number(prMatch[3]),
      type: "pull-request",
    };
  }
  return null;
}

// --- Internal: Fetch with GraphQL → REST fallback ---

async function fetchAndBuild(
  owner: string,
  repo: string,
  number: number,
  type: GitHubContentType,
  url: string,
): Promise<ContentBundle> {
  // Try GraphQL first (same-origin, authenticated via session cookie)
  if (isUserLoggedIn()) {
    try {
      return await fetchAndBuildGraphQL(owner, repo, number, type, url);
    } catch (err) {
      console.warn(
        "[ctxport/github] GraphQL failed, falling back to REST API:",
        err,
      );
    }
  }

  // Fallback to REST API (unauthenticated, cross-origin)
  return fetchAndBuildREST(owner, repo, number, type, url);
}

// --- GraphQL path ---

async function fetchAndBuildGraphQL(
  owner: string,
  repo: string,
  number: number,
  type: GitHubContentType,
  url: string,
): Promise<ContentBundle> {
  if (type === "pull-request") {
    const data = await githubGraphQL<GQLPullRequestData>(PR_QUERY, {
      owner,
      repo,
      number,
    });
    return buildPRBundleFromGQL(data, owner, repo, url);
  }

  const data = await githubGraphQL<GQLIssueData>(ISSUE_QUERY, {
    owner,
    repo,
    number,
  });
  return buildIssueBundleFromGQL(data, owner, repo, url);
}

function gqlLogin(author: { login: string } | null): string {
  return author?.login ?? "ghost";
}

function buildIssueBundleFromGQL(
  data: GQLIssueData,
  owner: string,
  repo: string,
  url: string,
): ContentBundle {
  const issue = data.repository.issue;
  const participantMap = new Map<string, Participant>();
  const authorLogin = gqlLogin(issue.author);
  addParticipant(participantMap, authorLogin, "author");

  const nodes: ContentNode[] = [];

  nodes.push({
    id: generateId(),
    participantId: authorLogin,
    content: issue.body ?? "",
    order: 0,
    type: "issue",
    timestamp: issue.createdAt,
    meta: { state: issue.state.toLowerCase(), repo: `${owner}/${repo}` },
  });

  for (const [i, c] of issue.comments.nodes.entries()) {
    const login = gqlLogin(c.author);
    addParticipant(participantMap, login, "commenter");
    nodes.push({
      id: generateId(),
      participantId: login,
      content: c.body,
      order: i + 1,
      type: "comment",
      timestamp: c.createdAt,
    });
  }

  return {
    id: generateId(),
    title: `#${issue.number} ${issue.title}`,
    participants: Array.from(participantMap.values()),
    nodes,
    source: {
      platform: "github",
      url,
      extractedAt: new Date().toISOString(),
      pluginId: "github",
      pluginVersion: "1.0.0",
    },
    tags: issue.labels.nodes.map((l) => l.name),
  };
}

function buildPRBundleFromGQL(
  data: GQLPullRequestData,
  owner: string,
  repo: string,
  url: string,
): ContentBundle {
  const pr = data.repository.pullRequest;
  const participantMap = new Map<string, Participant>();
  const authorLogin = gqlLogin(pr.author);
  addParticipant(participantMap, authorLogin, "author");

  const nodes: ContentNode[] = [];
  let order = 0;

  nodes.push({
    id: generateId(),
    participantId: authorLogin,
    content: pr.body ?? "",
    order: order++,
    type: "pull-request",
    timestamp: pr.createdAt,
    meta: {
      state: pr.state.toLowerCase(),
      merged: pr.merged,
      repo: `${owner}/${repo}`,
    },
  });

  // Collect all comments + review comments, sort by timestamp
  const allComments: Array<{
    body: string;
    user: string;
    timestamp: string;
    type: string;
    meta?: Record<string, unknown>;
  }> = [];

  for (const c of pr.comments.nodes) {
    const login = gqlLogin(c.author);
    addParticipant(participantMap, login, "commenter");
    allComments.push({
      body: c.body,
      user: login,
      timestamp: c.createdAt,
      type: "comment",
    });
  }

  for (const review of pr.reviews.nodes) {
    for (const c of review.comments.nodes) {
      const login = gqlLogin(c.author);
      addParticipant(participantMap, login, "reviewer");
      allComments.push({
        body: c.body,
        user: login,
        timestamp: c.createdAt,
        type: "review-comment",
        meta: { path: c.path, diff_hunk: c.diffHunk },
      });
    }
  }

  allComments.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  for (const c of allComments) {
    nodes.push({
      id: generateId(),
      participantId: c.user,
      content: c.body,
      order: order++,
      type: c.type,
      timestamp: c.timestamp,
      meta: c.meta,
    });
  }

  return {
    id: generateId(),
    title: `#${pr.number} ${pr.title}`,
    participants: Array.from(participantMap.values()),
    nodes,
    source: {
      platform: "github",
      url,
      extractedAt: new Date().toISOString(),
      pluginId: "github",
      pluginVersion: "1.0.0",
    },
    tags: pr.labels.nodes.map((l) => l.name),
  };
}

// --- REST API path (fallback) ---

async function fetchAndBuildREST(
  owner: string,
  repo: string,
  number: number,
  type: GitHubContentType,
  url: string,
): Promise<ContentBundle> {
  const basePath = `/repos/${owner}/${repo}`;

  if (type === "pull-request") {
    const [pr, comments, reviewComments] = await Promise.all([
      githubFetch<GitHubPullRequest>(`${basePath}/pulls/${number}`),
      fetchAllPages<GitHubComment>(`${basePath}/issues/${number}/comments`),
      fetchAllPages<GitHubReviewComment>(
        `${basePath}/pulls/${number}/comments`,
      ),
    ]);
    return buildPRBundle(pr, comments, reviewComments, owner, repo, url);
  }

  const [issue, comments] = await Promise.all([
    githubFetch<GitHubIssue>(`${basePath}/issues/${number}`),
    fetchAllPages<GitHubComment>(`${basePath}/issues/${number}/comments`),
  ]);
  return buildIssueBundle(issue, comments, owner, repo, url);
}

async function githubFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: { Accept: "application/vnd.github.v3+json" },
    credentials: "omit",
  });

  if (response.status === 403) {
    throw createAppError(
      "E-PARSE-005",
      "GitHub API rate limit exceeded. Please try again later.",
    );
  }

  if (!response.ok) {
    throw createAppError(
      "E-PARSE-005",
      `GitHub API responded with ${response.status}`,
    );
  }

  return (await response.json()) as T;
}

async function fetchAllPages<T>(path: string): Promise<T[]> {
  const results: T[] = [];
  let url = `${API_BASE}${path}?per_page=100`;

  while (url) {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/vnd.github.v3+json" },
      credentials: "omit",
    });

    if (response.status === 403) {
      throw createAppError(
        "E-PARSE-005",
        "GitHub API rate limit exceeded. Please try again later.",
      );
    }
    if (!response.ok) {
      throw createAppError(
        "E-PARSE-005",
        `GitHub API responded with ${response.status}`,
      );
    }

    const data = (await response.json()) as T[];
    results.push(...data);

    // Parse Link header for next page
    const link = response.headers.get("Link");
    const nextMatch = link && /<([^>]+)>;\s*rel="next"/.exec(link);
    url = nextMatch ? nextMatch[1]! : "";
  }

  return results;
}

// --- REST bundle builders (unchanged) ---

function buildIssueBundle(
  issue: GitHubIssue,
  comments: GitHubComment[],
  owner: string,
  repo: string,
  url: string,
): ContentBundle {
  const participantMap = new Map<string, Participant>();
  addParticipant(participantMap, issue.user.login, "author");
  for (const c of comments)
    addParticipant(participantMap, c.user.login, "commenter");

  const nodes: ContentNode[] = [];

  nodes.push({
    id: generateId(),
    participantId: issue.user.login,
    content: issue.body ?? "",
    order: 0,
    type: "issue",
    timestamp: issue.created_at,
    meta: { state: issue.state, repo: `${owner}/${repo}` },
  });

  for (const [i, c] of comments.entries()) {
    nodes.push({
      id: generateId(),
      participantId: c.user.login,
      content: c.body,
      order: i + 1,
      type: "comment",
      timestamp: c.created_at,
    });
  }

  return {
    id: generateId(),
    title: `#${issue.number} ${issue.title}`,
    participants: Array.from(participantMap.values()),
    nodes,
    source: {
      platform: "github",
      url,
      extractedAt: new Date().toISOString(),
      pluginId: "github",
      pluginVersion: "1.0.0",
    },
    tags: issue.labels.map((l) => l.name),
  };
}

function buildPRBundle(
  pr: GitHubPullRequest,
  comments: GitHubComment[],
  reviewComments: GitHubReviewComment[],
  owner: string,
  repo: string,
  url: string,
): ContentBundle {
  const participantMap = new Map<string, Participant>();
  addParticipant(participantMap, pr.user.login, "author");
  for (const c of comments)
    addParticipant(participantMap, c.user.login, "commenter");
  for (const c of reviewComments)
    addParticipant(participantMap, c.user.login, "reviewer");

  const nodes: ContentNode[] = [];
  let order = 0;

  nodes.push({
    id: generateId(),
    participantId: pr.user.login,
    content: pr.body ?? "",
    order: order++,
    type: "pull-request",
    timestamp: pr.created_at,
    meta: { state: pr.state, merged: pr.merged, repo: `${owner}/${repo}` },
  });

  // Merge comments and review comments by timestamp
  const allComments: Array<{
    body: string;
    user: string;
    timestamp: string;
    type: string;
    meta?: Record<string, unknown>;
  }> = [];

  for (const c of comments) {
    allComments.push({
      body: c.body,
      user: c.user.login,
      timestamp: c.created_at,
      type: "comment",
    });
  }
  for (const c of reviewComments) {
    allComments.push({
      body: c.body,
      user: c.user.login,
      timestamp: c.created_at,
      type: "review-comment",
      meta: { path: c.path, diff_hunk: c.diff_hunk },
    });
  }

  allComments.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  for (const c of allComments) {
    nodes.push({
      id: generateId(),
      participantId: c.user,
      content: c.body,
      order: order++,
      type: c.type,
      timestamp: c.timestamp,
      meta: c.meta,
    });
  }

  return {
    id: generateId(),
    title: `#${pr.number} ${pr.title}`,
    participants: Array.from(participantMap.values()),
    nodes,
    source: {
      platform: "github",
      url,
      extractedAt: new Date().toISOString(),
      pluginId: "github",
      pluginVersion: "1.0.0",
    },
    tags: pr.labels.map((l) => l.name),
  };
}

function addParticipant(
  map: Map<string, Participant>,
  login: string,
  role?: string,
): void {
  if (map.has(login)) return;
  map.set(login, { id: login, name: login, role });
}
