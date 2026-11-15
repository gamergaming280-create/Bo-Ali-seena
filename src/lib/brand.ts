import "server-only";
import { createClient } from "@/lib/supabase/server";

// Confirmed defaults, used if the database can't be reached. Real values live in academy_settings and are edited in Settings.
export const BRAND = {
  name: "Bo Ali Seena English Language and Computer Center",
  tagline: "New approach towards linguistic enlightenment.",
  motto: "Plants are shaped by cultivation and men by education.",
  portal: "Bo Ali Seena Academic Portal",
  logo: null as string | null,
};

export async function getBrand() {
  try {
    const { data } = await createClient().rpc("get_branding");
    const b = (data ?? {}) as Record<string, unknown>;
    const str = (k: string, d: string) => (typeof b[k] === "string" && (b[k] as string).trim() ? (b[k] as string) : d);
    return { name: str("institution_name", BRAND.name), tagline: str("tagline", BRAND.tagline), motto: str("motto", BRAND.motto), portal: str("portal_name", BRAND.portal), logo: typeof b.logo_url === "string" && b.logo_url ? (b.logo_url as string) : null };
  } catch { return BRAND; }
}
