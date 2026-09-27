import type {
  MediaAssetStatus,
  ProductStatus,
  VariantStatus,
} from "@eshanika/database/enums";

// The fields the publish rules read. ProductDetail satisfies it, and bulk
// actions load only this much.
export type PublishCheck = {
  variants: Array<{
    status: VariantStatus;
    archivedAt: string | null;
    isDefault: boolean;
    regularPrice: string;
  }>;
  primaryMedia: Array<{
    status: MediaAssetStatus;
    altText: string | null;
  }>;
};

export type PublishState = PublishCheck & {
  id: string;
  name: string;
  status: ProductStatus;
  updatedAt: Date;
};

export type ProductListItem = {
  id: string;
  name: string;
  slug: string;
  status: ProductStatus;
  productType: "simple" | "variable";
  taxStatus: "taxable" | "shipping" | "none";
  createdAt: string;
  updatedAt: string;
  categories: Array<{ id: string; name: string; slug: string }>;
  tags: Array<{ id: string; name: string; slug: string }>;
  variants: Array<{
    id: string;
    name: string;
    sku: string;
    regularPrice: string;
    salePrice: string | null;
    isDefault: boolean;
    status: VariantStatus;
  }>;
  primaryMedia: Array<{
    id: string;
    altText: string | null;
    status: MediaAssetStatus;
  }>;
};

export type ProductDetail = Omit<ProductListItem, "variants"> & {
  description: string | null;
  shortDescription: string | null;
  taxClass: string | null;
  publishedAt: string | null;
  archivedAt: string | null;
  attributes: Array<{
    id: string;
    name: string;
    slug: string;
    useForVariants: boolean;
    sortOrder: number;
    options: Array<{
      id: string;
      name: string;
      slug: string;
      swatchValue: string | null;
    }>;
  }>;
  variants: Array<{
    id: string;
    name: string;
    sku: string;
    regularPrice: string;
    salePrice: string | null;
    currencyCode: string;
    saleStartsAt: string | null;
    saleEndsAt: string | null;
    stockStatus: "in_stock" | "out_of_stock";
    manageStock: boolean;
    backorderPolicy: "no" | "notify" | "allow";
    weight: string | null;
    length: string | null;
    width: string | null;
    height: string | null;
    isDefault: boolean;
    status: VariantStatus;
    archivedAt: string | null;
    attributeOptions: Array<{
      attributeId: string;
      attributeOptionId: string;
      name: string;
      slug: string;
    }>;
  }>;
};

export type VariantCombination = Array<{
  attributeId: string;
  attributeOptionId: string;
}>;
