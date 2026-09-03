import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { ReferentialManager, type ReferentialRow } from "@/components/admin/referentiel-manager";
import { AdminNav } from "@/components/admin/admin-nav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata: Metadata = { title: "Référentiels" };

export default async function AdminReferentielsPage() {
  await requireAdmin();
  const admin = createAdminClient();

  const [{ data: occasions }, { data: emotions }, { data: styles }, { data: voices }] = await Promise.all([
    admin.from("occasions").select("id, slug, name, description, icon, active, sort_order").order("sort_order"),
    admin.from("emotions").select("id, slug, name, active, sort_order").order("sort_order"),
    admin
      .from("music_styles")
      .select("id, slug, name, description, active, sort_order")
      .order("sort_order"),
    admin.from("voices").select("id, slug, name, gender, category, active, sort_order").order("sort_order"),
  ]);

  return (
    <main className="flex-1 bg-secondary/20">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <AdminNav />
        <h1 className="mt-6 font-heading text-3xl font-semibold">Référentiels</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Occasions, émotions, styles musicaux, voix — créer, modifier, désactiver, réordonner (section 9-12).
        </p>

        <Tabs defaultValue="occasions" className="mt-8">
          <TabsList>
            <TabsTrigger value="occasions">Occasions</TabsTrigger>
            <TabsTrigger value="emotions">Émotions</TabsTrigger>
            <TabsTrigger value="styles">Styles</TabsTrigger>
            <TabsTrigger value="voices">Voix</TabsTrigger>
          </TabsList>

          <TabsContent value="occasions" className="mt-4">
            <ReferentialManager
              table="occasions"
              label="Occasions"
              initialRows={(occasions ?? []) as ReferentialRow[]}
              fields={[
                { key: "icon", label: "Icône (nom Lucide, ex. Cake)", type: "text" },
                { key: "description", label: "Description", type: "textarea" },
              ]}
            />
          </TabsContent>

          <TabsContent value="emotions" className="mt-4">
            <ReferentialManager
              table="emotions"
              label="Émotions"
              initialRows={(emotions ?? []) as ReferentialRow[]}
              fields={[]}
            />
          </TabsContent>

          <TabsContent value="styles" className="mt-4">
            <ReferentialManager
              table="music_styles"
              label="Styles musicaux"
              initialRows={(styles ?? []) as ReferentialRow[]}
              fields={[{ key: "description", label: "Description", type: "textarea" }]}
            />
          </TabsContent>

          <TabsContent value="voices" className="mt-4">
            <ReferentialManager
              table="voices"
              label="Voix"
              initialRows={(voices ?? []) as ReferentialRow[]}
              fields={[
                {
                  key: "gender",
                  label: "Genre",
                  type: "select",
                  options: [
                    { value: "masculine", label: "Masculine" },
                    { value: "feminine", label: "Féminine" },
                  ],
                },
                { key: "category", label: "Catégorie (ex. douce, puissante)", type: "text" },
              ]}
            />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
