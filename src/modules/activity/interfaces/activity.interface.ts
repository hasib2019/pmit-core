/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2023-05-23 10:58:17
 * @modify date 2023-05-23 10:58:17
 * @desc [description]
 */

export interface ActivityLogAttrs {
  id?: number;
  userId?: number;
  userType: "citizen" | "user" | "anonymous";
  componentId: number;
  activity: {
    url: string;
    ipAddress: string;
    userAgent: string;
    featureId: number;
    featureName: string;
    featureNameBan: string;
  };
}

export interface ErrorLogAttrs {
  id?: number;
  userId: number;
  userType: "citizen" | "user" | "anonymous";
  doptorId: number;
  componentId: number;
  error: string;
  createdAt: any,
  createdBy: number



}
