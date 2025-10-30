// eslint-disable-next-line import/no-extraneous-dependencies
import { z } from 'zod';

export const PostProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1).max(255),
  calocent: z.int().min(0).max(900),
  country_id: z.int().min(0),
});

export type ProductPost = z.infer<typeof PostProductSchema>;

export function validatePostProduct(json:unknown):
    | {ok: true, productPost: ProductPost}
    | {ok: false, issues: string} {
  const res = PostProductSchema.safeParse(json);
  if (res.success) {
    return { ok: true, productPost: res.data };
  }
  const issues = res.error.message;
  return { ok: false, issues };
}
