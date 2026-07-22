export type BranchStatus = "Active" | "Inactive" | "Archived";

export type Branch = {
  id: string;
  name: string;
  code: string;
  phone: string;
  email: string;
  address: string;
  googleMapsUrl: string;
  timeZone: string;
  status: BranchStatus;
  isMain: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BranchInput = Pick<
  Branch,
  | "name"
  | "phone"
  | "email"
  | "address"
  | "googleMapsUrl"
  | "timeZone"
  | "status"
  | "isMain"
>;

export type BranchFieldErrors = Partial<Record<keyof BranchInput | "form", string>>;

export type BranchFormOptions = {
  timeZones: { value: string; label: string }[];
  statuses: { value: "Active" | "Inactive"; label: string }[];
};
