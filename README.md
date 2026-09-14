# LHCA Learning Directory

This project is the public course directory for Leeds Health and Care Academy. It shows training courses from Supabase and includes an admin area for updating course data.

The public site reads course data from Supabase. The admin area uses Vercel API routes to create and update records in the database.

## Main files

- [index.html](index.html) — public course listing
- [admin.html](admin.html) — admin dashboard
- [script.js](script.js) — public filtering and display logic
- [admin.js](admin.js) — admin create and edit workflow
- [styles.css](styles.css) and [admin-styles.css](admin-styles.css) — page styling
- [api/courses/index.js](api/courses/index.js) and [api/courses/[id].js](api/courses/[id].js) — Vercel server routes for database writes
- [assets](assets) — branding and course images

## Local preview

Open [index.html](index.html) in a browser, or run the project through a local static preview tool such as Live Server in VS Code.

## Deployment

This project is deployed through Vercel and connected to the GitHub repository. Push to the main branch to trigger a deployment.
