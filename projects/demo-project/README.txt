Demo project
============
A tiny standalone HTML page used to demonstrate how a project is registered
in data/projects.json and launched from the dashboard.

Registration (see the "demo-project" entry in data/projects.json):
  "entry": { "localPath": "projects/demo-project/index.html" }

To add your own project:
  1. Create projects/<your-project>/index.html (any assets next to it).
  2. Add an entry to data/projects.json (see PROJECT-SPEC.md).
  3. Optionally put a thumbnail in assets/thumbnails/ and reference it in "cover.thumbnail".

The ?sample=... query strings used by the sample entries only change the heading of this page.
