export class PackageImageValidationError extends Error {}

export async function uploadPackageImage(_file: File): Promise<string> {
  void _file;
  throw new PackageImageValidationError(
    "Package image uploads are deferred to protect the Supabase Free storage quota.",
  );
}
