// holidayType: state.localState.holidayType,
// officeId: parseInt(state.localState.officeId),
// ...(state.localState.saveAndEditButtonLevel === "সংরক্ষণ করুন" && {
//   fromDate: state.localState.fromDate,
//   toDate: state.localState.toDate,
// }),
// ...(state.localState.saveAndEditButtonLevel === "হালদানাগাদ করুন" && {
//   holiday: state.localState.holidayDateForEdit,
// }),
// description: state.localState.holidayDescription,
// ...(state.localState.saveAndEditButtonLevel === "হালদানাগাদ করুন" && {
//   isActive: state.localState.status,
// }),

export interface HolidaySetupPayloadAttrs {
  holidayType?: String;
  officeId: number;
  doptorId: number;
  fromDate: Date;
  toDate: Date;
  holiday?: Date | String;
  description?: String;
  isActive?: boolean;
  createdBy?: String;
  createdAt?: Date;
  updatedAt?: Date;
  updatedBy?: String;
  dayName?: String;
}
