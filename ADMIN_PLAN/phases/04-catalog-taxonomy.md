# 04 Categories, attributes, tags

**Goal:** the building blocks products need.

## Build

- **Categories** (`/categories`): tree view with create, edit, reparent, reorder, and archive. Slugs are unique. No cycles: a category cannot move under itself or one of its children. Product counts are shown.
- **Attributes** (`/attributes`): name, slug, select or swatch display, order, and options (name, slug, swatch colour, order). Archive only. Usage counts are shown.
- **Tags** (`/tags`): name, slug, description. Search. Delete is allowed only when no product uses the tag. Otherwise remove it from products first.
- Procedures under `catalog.categories.*`, `catalog.attributes.*`, `catalog.tags.*`.

## Done when

- A category tree three levels deep can be built, reordered, and moved without creating a cycle.
- An archived attribute or option stays on existing products but cannot be picked for new ones.
