export type StaffBreak = {
  startTime: string;
  endTime: string;
};

export type StaffMember = {
  id: string;
  name: string;
  branchId: string;
  serviceIds: string[];
  workingDays: number[];
  breaks: StaffBreak[];
  isActive: boolean;
  createdAt: string;
};
