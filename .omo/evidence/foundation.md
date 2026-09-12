# Initial RED

Before the scaffold package manifest existed, `bun run build` exited 1:

```text
error: Script not found "build"
```

Final build exit=0
$ bun run typecheck && vite build
$ tsc -b
vite v8.3.0 building client environment for production...
transforming...
✓ 15 modules transformed.
rendering chunks...
computing gzip size...
dist/registerSW.js               0.13 kB
dist/manifest.webmanifest        0.15 kB
dist/index.html                  0.40 kB │ gzip:  0.27 kB
dist/assets/index-B4p9qiyN.js  219.66 kB │ gzip: 68.60 kB

✓ built in 154ms

PWA v1.3.0
mode      generateSW
precache  4 entries (215.04 KiB)
files generated
  dist/sw.js
  dist/workbox-9c191d2f.js

Verified final build exit=0
