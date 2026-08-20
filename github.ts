import { Octokit } from '@octokit/rest'

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })
const OWNER = process.env.GITHUB_REPO_OWNER
const REPO = process.env.GITHUB_REPO_NAME

export async function saveScriptToGitHub(botId: string, scriptId: string, name: string, code: string) {
  if (!OWNER || !REPO) throw new Error('GitHub repo not configured')

  const path = `bots/${botId}/scripts/${scriptId}_${name}.js`
  const content = Buffer.from(code).toString('base64')

  try {
    // Check if file exists
    const { data: existing } = await octokit.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path,
    })

    if ('sha' in existing) {
      await octokit.repos.createOrUpdateFileContents({
        owner: OWNER,
        repo: REPO,
        path,
        message: `Update script ${name} for bot ${botId}`,
        content,
        sha: existing.sha,
      })
    }
  } catch {
    // File doesn't exist, create it
    await octokit.repos.createOrUpdateFileContents({
      owner: OWNER,
      repo: REPO,
      path,
      message: `Create script ${name} for bot ${botId}`,
      content,
    })
  }
}

export async function deleteScriptFromGitHub(botId: string, scriptId: string, name: string) {
  if (!OWNER || !REPO) return

  const path = `bots/${botId}/scripts/${scriptId}_${name}.js`

  try {
    const { data: existing } = await octokit.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path,
    })

    if ('sha' in existing) {
      await octokit.repos.deleteFile({
        owner: OWNER,
        repo: REPO,
        path,
        message: `Delete script ${name} for bot ${botId}`,
        sha: existing.sha,
      })
    }
  } catch {
    // File doesn't exist
  }
}
