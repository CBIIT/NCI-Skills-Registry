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
