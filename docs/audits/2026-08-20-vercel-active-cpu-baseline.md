# Vercel Active CPU baseline

Measurements captured on 20 August 2026 before the static-rendering change.

| Route | Vercel cache | TTFB | Transfer |
| --- | --- | ---: | ---: |
| `/` | `MISS`, `private, no-store` | 7.39 s | 4.90 MB |
| `/locations` | `MISS`, `private, no-store` | 5.35 s | Not recorded |
| `/locations/rambert-studios` | `MISS`, `private, no-store` | 10.28 s | Not recorded |
| `/styles/ballet` | `PRERENDER` | 0.43 s | Not recorded |
| `/api/classes` | `MISS`, `no-store` | 1.28 s | 3.17 MB |

The dataset contained 2,712 normalized sessions. Before caching, one dataset read used 30 to 72 ms of CPU. One `getLocationProfiles()` call used about 1.9 seconds of CPU.

## Local result after the change

`npm run build` generated 164 static pages. The build classified `/`, `/calendar`, `/insights`, `/studios`, and `/locations` as static. It classified both detail route families as SSG. The generated homepage HTML contained the calendar heading and a real listing.

`npm run benchmark:runtime-data` produced these results on the same machine:

| Operation | CPU |
| --- | ---: |
| Dataset first read | 48.41 ms |
| Dataset cached read | 0 ms |
| Location profiles first derivation | 1,669.05 ms |
| Location profiles cached derivation | 0.03 ms |

`next start` returned `x-nextjs-cache: HIT`, `x-nextjs-prerender: 1`, and `Cache-Control: s-maxage=31536000` for the homepage and a location detail page. Local TTFB was 78 ms for `/` and 3 ms for `/locations/rambert-studios`.

The production comparison remains pending until this branch is deployed. Request each public route twice after deployment. An identical `/api/classes` query must move from `MISS` to `HIT` at Vercel's CDN.
