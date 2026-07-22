export class PackageImageValidationError extends Error {}
export async function uploadPackageImage(file: File): Promise<string> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new PackageImageValidationError("Choose a PNG, JPG, or WebP image.");
  if (file.size > 3 * 1024 * 1024) throw new PackageImageValidationError("The image must be 3 MB or smaller.");
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onerror = () => reject(new Error("The image could not be read.")); reader.onload = () => resolve(String(reader.result)); reader.readAsDataURL(file); });
}
