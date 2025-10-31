// eslint-disable-next-line import/no-extraneous-dependencies
import { z } from 'zod';

export const PatchProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1).max(255),
  calocent: z.number().int().min(0).max(900),
});

export type ProductPatch = z.infer<typeof PatchProductSchema>;

export function validatePatchProduct(json:unknown):
    | {ok: true, productPatch: ProductPatch}
    | {ok: false, issues: string} {
  const res = PatchProductSchema.safeParse(json);
  if (res.success) {
    return { ok: true, productPatch: res.data };
  }
  const issues = res.error.message;
  return { ok: false, issues };
}
