import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database";
import type { PackageInput, ServicePackage } from "@/types/packages";
import type {
  Service,
  ServiceCategory,
  ServiceCategoryInput,
  ServiceInput,
} from "@/types/services";

export async function getCatalogFromDatabase(
  client?: SupabaseClient<Database>,
) {
  const supabase = client ?? (await createClient());
  const [
    { data: categories, error: categoryError },
    { data: services, error: serviceError },
    { data: staff },
    { data: branches },
    { data: packages, error: packageError },
    { data: items },
  ] = await Promise.all([
    supabase.from("service_categories").select("*").order("name"),
    supabase.from("services").select("*").order("name"),
    supabase.from("service_staff").select("service_id,membership_id"),
    supabase.from("service_branches").select("service_id,branch_id"),
    supabase.from("service_packages").select("*").order("name"),
    supabase.from("package_items").select("*").order("sort_order"),
  ]);
  if (categoryError || serviceError || packageError) {
    throw new Error("The service catalog could not be loaded.");
  }

  const membershipIds = [...new Set((staff ?? []).map((row) => row.membership_id))];
  const { data: memberships } = membershipIds.length
    ? await supabase
        .from("organization_members")
        .select("id,staff_key")
        .in("id", membershipIds)
    : { data: [] };
  const staffKeyByMembership = new Map(
    (memberships ?? []).map((membership) => [membership.id, membership.staff_key]),
  );

  const categoryRecords: ServiceCategory[] = (categories ?? []).map((row) => ({
    createdAt: row.created_at,
    id: row.id,
    name: row.name,
    status: row.status === "active" ? "Active" : "Archived",
    updatedAt: row.updated_at,
  }));
  const serviceRecords: Service[] = (services ?? []).map((row) => ({
    branchIds: (branches ?? [])
      .filter((assignment) => assignment.service_id === row.id)
      .map((assignment) => assignment.branch_id),
    categoryId: row.category_id,
    createdAt: row.created_at,
    description: row.description,
    durationMinutes: row.duration_minutes,
    id: row.id,
    imageUrl: "",
    isActive: row.is_active,
    kind: "service",
    name: row.name,
    priceBhd: Number(row.price_bhd),
    staffIds: (staff ?? [])
      .filter((assignment) => assignment.service_id === row.id)
      .map((assignment) => staffKeyByMembership.get(assignment.membership_id))
      .filter((value): value is string => Boolean(value)),
    updatedAt: row.updated_at,
    vatApplicable: row.vat_applicable,
  }));
  const packageRecords: ServicePackage[] = (packages ?? []).map((row) => ({
    allowPriceAboveOriginal: row.allow_price_above_original,
    createdAt: row.created_at,
    description: row.description,
    id: row.id,
    imageUrl: "",
    isActive: row.is_active,
    items: (items ?? [])
      .filter((item) => item.package_id === row.id)
      .map((item) => ({
        id: item.id,
        packageId: row.id,
        quantity: item.quantity,
        serviceId: item.service_id,
        sortOrder: item.sort_order,
      })),
    name: row.name,
    sellingPriceBhd: Number(row.selling_price_bhd),
    type: row.type === "combo" ? "Combo" : "Flexible",
    updatedAt: row.updated_at,
  }));
  return { categories: categoryRecords, packages: packageRecords, services: serviceRecords };
}

export async function getServicesFromDatabase() {
  return (await getCatalogFromDatabase()).services;
}

export async function getServiceCategoriesFromDatabase(includeArchived = false) {
  const records = (await getCatalogFromDatabase()).categories;
  return records.filter((category) => includeArchived || category.status === "Active");
}

export async function getPackagesFromDatabase() {
  return (await getCatalogFromDatabase()).packages;
}

export async function saveCategoryInDatabase(
  id: string | null,
  input: ServiceCategoryInput,
) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("upsert_service_category", {
    category_name: input.name,
    category_status: input.status === "Active" ? "active" : "archived",
    target_category_id: id,
  });
  if (error || !data) throw new Error(catalogError(error?.message));
  return {
    createdAt: data.created_at,
    id: data.id,
    name: data.name,
    status: data.status === "active" ? "Active" : "Archived",
    updatedAt: data.updated_at,
  } satisfies ServiceCategory;
}

export async function archiveOrDeleteCategoryInDatabase(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "archive_or_delete_service_category",
    { target_category_id: id },
  );
  if (error) throw new Error(catalogError(error.message));
  return data as "archived" | "deleted";
}

export async function saveServiceInDatabase(id: string | null, input: ServiceInput) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("upsert_catalog_service", {
    service_branch_ids: input.branchIds,
    service_category_id: input.categoryId,
    service_description: input.description,
    service_duration_minutes: input.durationMinutes,
    service_is_active: input.isActive,
    service_name: input.name,
    service_price_bhd: input.priceBhd,
    service_staff_keys: input.staffIds,
    service_vat_applicable: input.vatApplicable,
    target_service_id: id,
  });
  if (error || !data) throw new Error(catalogError(error?.message));
  return (await getCatalogFromDatabase(supabase)).services.find(
    (service) => service.id === data.id,
  )!;
}

export async function savePackageInDatabase(id: string | null, input: PackageInput) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("upsert_service_package", {
    package_allow_price_above_original: input.allowPriceAboveOriginal,
    package_description: input.description,
    package_is_active: input.isActive,
    package_items: input.items.map((item, index) => ({
      quantity: item.quantity,
      service_id: item.serviceId,
      sort_order: index,
    })) as unknown as Json,
    package_kind: input.type === "Combo" ? "combo" : "flexible",
    package_name: input.name,
    package_selling_price_bhd: input.sellingPriceBhd,
    target_package_id: id,
  });
  if (error || !data) throw new Error(catalogError(error?.message));
  return (await getCatalogFromDatabase(supabase)).packages.find(
    (item) => item.id === data.id,
  )!;
}

function catalogError(message = "") {
  if (message.includes("CATEGORY_NAME_EXISTS")) return "A category with this name already exists.";
  if (message.includes("SERVICE_NAME_EXISTS")) return "A service with this name already exists in the category.";
  if (message.includes("PACKAGE_NAME_EXISTS")) return "A package with this name already exists.";
  if (message.includes("PACKAGE_PRICE_TOO_HIGH")) return "Selling price cannot exceed the original total unless explicitly allowed.";
  if (message.includes("CATALOG_FORBIDDEN")) return "You do not have permission to manage the service catalog.";
  if (message.includes("CATEGORY_INVALID")) return "Select an active category.";
  if (message.includes("PACKAGE_ITEMS")) return "Package services are invalid or duplicated.";
  if (message.includes("NOT_FOUND")) return "The catalog record could not be found.";
  return "The catalog change could not be saved.";
}
