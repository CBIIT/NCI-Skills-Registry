# NCI Application Registry

Static dashboard and application inventory for the NCI Skills Registry.

## Run locally

From the repository root, start a local HTTP server:

```sh
python3 -m http.server 8000
```

Open the dashboard at `http://localhost:8000/` or the startup baseline at
`http://localhost:8000/hello-world.html`.

The Hello World route is intentionally separate from the dashboard so startup
plumbing can be verified without replacing the existing application.

## Application cards

Open `http://localhost:8000/cards.html` to see a card for every registered
application, with links to its repository, app, and dashboard. When an app has
a `dashboardApiUrl` in `registry.json`, its card also shows live summary data
from that API. Register the URL only after verifying that the deployed
`/api/dashboard` endpoint returns a valid schema version 1 payload.

Some dashboard APIs allow requests only from the deployed registry origin
(`https://cbiit.github.io`). Those cards will show "Unavailable" when the
registry is served locally.
