export interface ItemGroupAttributes {
  id?: number;
  groupName: String;
  createdBy?: String;
  createdAt?: Date;
  updatedBy?: String;
  updatedAt?: Date;
  updateHistory?: any;
}

// group_name character varying(200) NOT NULL,
// group_code character varying(200) NOT NULL,
//           created_by character varying(50)  NOT NULL,
//           created_at timestamp with time zone NOT NULL,
//           updated_by character varying(50) ,
//           updated_at timestamp with time zone,
//           update_history jsonb
