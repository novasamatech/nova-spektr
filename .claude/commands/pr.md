Generate a pull request description for the current branch.

Instructions:
1. Run `git diff dev...HEAD --stat` to see which files changed
2. Run `git diff dev...HEAD` to see the full diff
3. Analyze the changes and produce a PR description in this format:

.github/PULL_REQUEST_TEMPLATE.md

Rules:
- Keep it concise — a reviewer should understand the PR in 30 seconds
- Focus on the "why" not the "what" — the diff shows the what
- Group related changes together
- Include specific test steps, not generic ones
- Do NOT include a title — that will be set separately
- Output ONLY the markdown body, ready to paste
