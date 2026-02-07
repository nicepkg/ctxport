/** GitHub same-origin GraphQL client — uses session cookie + CSRF token for authentication */

// --- CSRF & Login helpers ---

export function getCsrfToken(): string | null {
  const meta = document.querySelector<HTMLMetaElement>(
    'meta[name="csrf-token"]',
  );
  return meta?.content ?? null;
}

export function isUserLoggedIn(): boolean {
  const meta = document.querySelector<HTMLMetaElement>(
    'meta[name="user-login"]',
  );
  return !!meta?.content;
}

// --- GraphQL client ---

export async function githubGraphQL<T>(
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const csrfToken = getCsrfToken();
  if (!csrfToken) {
    throw new Error("CSRF token not found — user may not be logged in");
  }

  const response = await fetch("https://github.com/graphql", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.status}`);
  }

  const json = (await response.json()) as {
    data?: T;
    errors?: Array<{ message: string }>;
  };
  if (json.errors?.length) {
    throw new Error(
      `GraphQL errors: ${json.errors.map((e) => e.message).join(", ")}`,
    );
  }
  if (!json.data) {
    throw new Error("GraphQL response missing data");
  }

  return json.data;
}

// --- GraphQL queries ---

export const ISSUE_QUERY = `
query ($owner: String!, $repo: String!, $number: Int!) {
  repository(owner: $owner, name: $repo) {
    issue(number: $number) {
      number
      title
      body
      state
      createdAt
      author { login }
      labels(first: 20) {
        nodes { name }
      }
      comments(first: 100) {
        nodes {
          body
          createdAt
          author { login }
        }
      }
    }
  }
}
`;

export const PR_QUERY = `
query ($owner: String!, $repo: String!, $number: Int!) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $number) {
      number
      title
      body
      state
      merged
      createdAt
      author { login }
      labels(first: 20) {
        nodes { name }
      }
      comments(first: 100) {
        nodes {
          body
          createdAt
          author { login }
        }
      }
      reviews(first: 100) {
        nodes {
          body
          createdAt
          author { login }
          comments(first: 100) {
            nodes {
              body
              path
              diffHunk
              createdAt
              author { login }
            }
          }
        }
      }
    }
  }
}
`;

// --- GraphQL response types ---

interface GQLActor {
  login: string;
}

interface GQLLabel {
  name: string;
}

interface GQLComment {
  body: string;
  createdAt: string;
  author: GQLActor | null;
}

interface GQLReviewComment {
  body: string;
  path: string;
  diffHunk: string;
  createdAt: string;
  author: GQLActor | null;
}

interface GQLReview {
  body: string;
  createdAt: string;
  author: GQLActor | null;
  comments: { nodes: GQLReviewComment[] };
}

export interface GQLIssueData {
  repository: {
    issue: {
      number: number;
      title: string;
      body: string | null;
      state: string;
      createdAt: string;
      author: GQLActor | null;
      labels: { nodes: GQLLabel[] };
      comments: { nodes: GQLComment[] };
    };
  };
}

export interface GQLPullRequestData {
  repository: {
    pullRequest: {
      number: number;
      title: string;
      body: string | null;
      state: string;
      merged: boolean;
      createdAt: string;
      author: GQLActor | null;
      labels: { nodes: GQLLabel[] };
      comments: { nodes: GQLComment[] };
      reviews: { nodes: GQLReview[] };
    };
  };
}
