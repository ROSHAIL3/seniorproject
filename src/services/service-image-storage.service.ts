export class ServiceImageValidationError extends Error {}
export async function uploadServiceImage(file: File): Promise<string> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new ServiceImageValidationError("Choose a PNG, JPG, or WebP image.");
  if (file.size > 3 * 1024 * 1024) throw new ServiceImageValidationError("The image must be 3 MB or smaller.");
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onerror = () => reject(new Error("The image could not be read.")); reader.onload = () => resolve(String(reader.result)); reader.readAsDataURL(file); });
}
