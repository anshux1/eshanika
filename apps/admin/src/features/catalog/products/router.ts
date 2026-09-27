import { adminProcedure } from "@/orpc/procedures";
import { productService } from "./ProductService";
import {
  bulkProductStatusInputSchema,
  changeProductStatusInputSchema,
  createProductInputSchema,
  generateVariantCombinationsInputSchema,
  getProductInputSchema,
  listProductsInputSchema,
  updateProductInputSchema,
} from "./schema";

export const productsRouter = {
  list: adminProcedure()
    .input(listProductsInputSchema)
    .handler(({ input }) => productService.list(input)),

  get: adminProcedure()
    .input(getProductInputSchema)
    .handler(({ input }) => productService.get(input.id)),

  create: adminProcedure("catalog.write")
    .input(createProductInputSchema)
    .handler(({ input, context }) =>
      productService.create(input, context.actor),
    ),

  update: adminProcedure("catalog.write")
    .input(updateProductInputSchema)
    .handler(({ input, context }) =>
      productService.update(input, context.actor),
    ),

  setStatus: adminProcedure("catalog.write")
    .input(changeProductStatusInputSchema)
    .handler(({ input, context }) =>
      productService.changeStatus(input, context.actor),
    ),

  bulkStatus: adminProcedure("catalog.write")
    .input(bulkProductStatusInputSchema)
    .handler(({ input, context }) =>
      productService.bulkChangeStatus(
        input.ids,
        input.action === "publish" ? "active" : "archived",
        context.actor,
      ),
    ),

  generateVariantCombinations: adminProcedure()
    .input(generateVariantCombinationsInputSchema)
    .handler(({ input }) => productService.generateVariantCombinations(input)),
};
