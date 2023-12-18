/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-08-28 15:47:03
 * @modify date 2022-08-28 15:47:03
 * @desc [description]
 */

import { body } from "express-validator";

export const dayOpenCloseValidator = [
  body("*.projectId")
    .exists()
    .isInt({ min: 1 })
    .withMessage(
      "প্রকল্পের নাম অবশ্যই সাংখ্যিক হতে হবে এবং সর্বনিম্ন ১ হতে হবে "
    ),
];
