import { body, param } from "express-validator";
export const productCreateUpdateValidator = [
  body("productName", "প্রোডাক্ট এর নাম দিন").exists().notEmpty(),
  body("productCode", "প্রোডাক্ট এর কোড দিন").exists().notEmpty(),
  body("openDate", "প্রোডাক্ট শুরুর তারিখ দিন").exists().notEmpty(),
  body("projectId", "প্রকল্পের নাম নির্বাচন করুন").exists().notEmpty(),
  body("productGl", "প্রোডাক্টটির জিএল নির্বাচন করুন").exists().notEmpty(),
];
