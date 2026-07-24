# kodingvibes — Agent Notes

## Versioning & releases
- This repo uses [Semantic Release](https://semantic-release.gitbook.io/semantic-release) via `.github/workflows/release.yml`.
- Commits pushed to `main` must follow [Conventional Commits](https://www.conventionalcommits.org/):
  - `feat:` → minor bump
  - `fix:`, `perf:`, `revert:` → patch bump
  - `BREAKING CHANGE:` in commit body or `feat!:` / `fix!:` → major bump
  - `chore:`, `docs:`, `style:`, `refactor:`, `test:` → no version bump by themselves
- Do **not** bump `package.json#version` manually. The release workflow updates it, generates `CHANGELOG.md`, and creates a GitHub release.
- The app is deployed to Vercel from the `kodingvibes` project; releases here are independent of Vercel deploys unless the workflow is extended to trigger them.

## Day-to-day
- Dev server: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
