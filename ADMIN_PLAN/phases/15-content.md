# 15 Content and navigation

**Goal:** edit store pages, the footer, and menus.

## Build

- `/content/pages`: list with status filter. Editor: title, slug, body (rich text editor that saves HTML), status (`draft`, `published`, `private`, `archived`), preview.
- `/content/footer`: edits the single footer entry (`kind = footer`).
- `/content/menus`: menus by location (for example `header`, `footer`). Flat items with a label and exactly one target: a category, a page, or a URL. Drag to reorder.

## Rules

- HTML is sanitised on the server when saved, with an allowlist of tags and attributes.
- URLs must be `https://` or a site-relative path.
- A published page cannot be archived while a menu links to it. Remove the link first.

## Done when

- A page is drafted, previewed, published, and added to the header menu. Pasted `<script>` tags are stripped.
