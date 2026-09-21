# Deployed by GitHub Pages from a public repo, no build step

The site is served by GitHub Pages from the root of `main`, using the built-in branch setting rather than a workflow. There is no build step, so push-to-deploy is the whole pipeline. Vercel, Netlify and Cloudflare Pages are all functionally identical for a site with no server functions; GitHub Pages wins only by needing one fewer account and keeping the deploy configuration in the repository.

The repo is public. Nothing sensitive lives in the code — a team's roster travels in the Board URL, never in the source.

## The constraint worth remembering

GitHub Pages on a **private** repository requires a paid GitHub plan. If this repo ever has to become private on a free plan, Pages stops being an option and the deployment target should move to Cloudflare Pages, which serves private repos for free. That is the only reason this decision would need revisiting.
