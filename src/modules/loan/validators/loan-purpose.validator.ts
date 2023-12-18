import { body } from "express-validator";

export const createLoanPurposeCategory = [
   body('id')
      .optional()
      .isInt()
      .withMessage("id is invalid"),
   body("categoryName")
      .notEmpty()
      .withMessage("name is mandatory")
      .isString()
      .withMessage("name data type mismacthed"),
   body("categoryDesc")
      .notEmpty()
      .withMessage("description is mandatory")
      .isString()
      .withMessage("description data type mismacthed"),
   body("subCategories")
      .notEmpty()
      .withMessage("Sub categories are mandatory")
      .isArray({ min: 1 })
      .withMessage("minimum one sub category is required"),
]

export const createLoanPurpose = [
   body('id')
      .optional()
      .isInt()
      .withMessage("id is invalid"),
   body('isActive')
      .optional()
      .isBoolean()
      .withMessage("status is empty"),
   body("purposeName")
      .notEmpty()
      .withMessage("name is mandatory")
      .isString()
      .withMessage("name data type mismacthed"),
   body("categoryId")
      .notEmpty()
      .withMessage("category id is mandatory")
      .isInt({ min: 1 })
      .withMessage("category data type mismacthed"),
   body("subCategoryId")
      .notEmpty()
      .withMessage("sub category id is mandatory")
      .isInt({ min: 1 })
      .withMessage("sub category data type mismacthed"),

]