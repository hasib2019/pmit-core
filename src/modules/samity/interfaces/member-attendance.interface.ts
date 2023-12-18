export interface IMemberAttendanceAttrs {
  id?: number;
  doptorId?: number;
  projectId?: number;
  officeId?: number;
  samityId?: number;
  attendance?: object[];
  meetingTypeId?: number;
  meetingAgenda?: string;
  meetingNotes?: string;
  meetingDate?: Date;
  status?: boolean;
  imageName?: string[];
  createdBy?: string;
  createdAt?: Date;
  updatedBy?: string;
  updatedAt?: Date;
}
