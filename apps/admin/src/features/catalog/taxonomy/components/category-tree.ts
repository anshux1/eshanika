import type { RouterOutputs } from "@/orpc/types";

export type Category =
  RouterOutputs["catalog"]["categories"]["list"]["items"][number];

export type CategoryNode = Category & {
  depth: number;
  children: CategoryNode[];
};

// Shoppers browse at most three levels: category, subcategory, and one more.
export const MAX_CATEGORY_DEPTH = 3;

export function buildCategoryTree(items: Category[]): CategoryNode[] {
  const nodes = new Map<string, CategoryNode>(
    items.map((item) => [item.id, { ...item, depth: 1, children: [] }]),
  );
  const roots: CategoryNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  const sortAndDepth = (list: CategoryNode[], depth: number) => {
    list.sort((a, b) => a.sortOrder - b.sortOrder);
    for (const node of list) {
      node.depth = depth;
      sortAndDepth(node.children, depth + 1);
    }
  };
  sortAndDepth(roots, 1);
  return roots;
}

export function flattenTree(nodes: CategoryNode[]): CategoryNode[] {
  return nodes.flatMap((node) => [node, ...flattenTree(node.children)]);
}

export function subtreeHeight(node: CategoryNode): number {
  let height = 0;
  for (const child of node.children) {
    height = Math.max(height, subtreeHeight(child));
  }
  return height + 1;
}

export function descendantIds(node: CategoryNode): Set<string> {
  return new Set(flattenTree(node.children).map((child) => child.id));
}

// Keeps matches and every ancestor, so results stay readable as a tree.
export function filterTree(
  nodes: CategoryNode[],
  query: string,
): CategoryNode[] {
  const needle = query.toLowerCase();
  return nodes.flatMap((node) => {
    const children = filterTree(node.children, query);
    const matches =
      node.name.toLowerCase().includes(needle) || node.slug.includes(needle);
    return matches || children.length > 0 ? [{ ...node, children }] : [];
  });
}
