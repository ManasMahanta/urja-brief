// Minimal GitHub REST client for opening a pull request that adds one file.
// Uses a token from GITHUB_TOKEN (repo scope) and GITHUB_REPO ("owner/name").
// Everything degrades gracefully: githubConfigured() gates the callers.

const API = "https://api.github.com";

export function githubConfigured(): boolean {
  return Boolean(process.env.GITHUB_TOKEN && process.env.GITHUB_REPO);
}

function headers() {
  return {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "User-Agent": "urja-brief-publisher",
  };
}

async function gh<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}/repos/${process.env.GITHUB_REPO}${path}`, {
    ...init,
    headers: headers(),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`GitHub ${init?.method ?? "GET"} ${path} → ${res.status}: ${await res.text().catch(() => "")}`);
  }
  return (await res.json()) as T;
}

/**
 * Create a branch off the default branch, commit `content` at `filePath`,
 * and open a pull request. Returns the new PR's URL.
 */
export async function openFilePR(opts: {
  filePath: string;
  content: string;
  branch: string;
  commitMessage: string;
  prTitle: string;
  prBody: string;
}): Promise<string> {
  const repo = await gh<{ default_branch: string }>("");
  const base = repo.default_branch;

  const ref = await gh<{ object: { sha: string } }>(
    `/git/ref/heads/${base}`,
  );
  const baseSha = ref.object.sha;

  await gh(`/git/refs`, {
    method: "POST",
    body: JSON.stringify({ ref: `refs/heads/${opts.branch}`, sha: baseSha }),
  });

  await gh(`/contents/${opts.filePath}`, {
    method: "PUT",
    body: JSON.stringify({
      message: opts.commitMessage,
      content: Buffer.from(opts.content, "utf8").toString("base64"),
      branch: opts.branch,
    }),
  });

  const pr = await gh<{ html_url: string }>(`/pulls`, {
    method: "POST",
    body: JSON.stringify({
      title: opts.prTitle,
      head: opts.branch,
      base,
      body: opts.prBody,
    }),
  });

  return pr.html_url;
}
