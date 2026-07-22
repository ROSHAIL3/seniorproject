export type PackageType = "Combo" | "Flexible";
export type PackageItem = { id: string; packageId: string; serviceId: string; quantity: number; sortOrder: number };
export type ServicePackage = {
  id: string;
  name: string;
  description: string;
  type: PackageType;
  sellingPriceBhd: number;
  imageUrl: string;
  isActive: boolean;
  allowPriceAboveOriginal: boolean;
  items: PackageItem[];
  createdAt: string;
  updatedAt: string;
};
export type PackageInput = Pick<ServicePackage, "name" | "description" | "type" | "sellingPriceBhd" | "imageUrl" | "isActive" | "allowPriceAboveOriginal"> & { items: Array<Pick<PackageItem, "id" | "serviceId" | "quantity" | "sortOrder">> };
export type PackageFieldErrors = Partial<Record<"name" | "sellingPriceBhd" | "items" | "form", string>>;
export type PackageUsage = { id: string; packageId: string; customerId: string; appointmentId: string; usedQuantities: Record<string, number>; createdAt: string };
