export class ServiceImageValidationError extends Error {}

export async function uploadServiceImage(_file: File): Promise<string> {
  void _file;
  throw new ServiceImageValidationError(
    "Catalog image uploads are deferred to protect the Supabase Free storage quota. Existing static images remain supported.",
  );
}
