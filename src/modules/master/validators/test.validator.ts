import { body } from "express-validator";


export const complexValidation = [
    body('name', "Name must be a string")
        .isLength({ min: 1 }),
    body('age', "age must be a integer")
        .isInt(),
    body('favoriteBooks', "favoriteBooks must be an array with min single value")
        .isArray({ min: 1 }),
    body('favoriteBooks.*.name', "Name must be a string")
        .isLength({ min: 1 }),
    body('favoriteBooks.*.writer', "Name must be a string")
        .isLength({ min: 1 }),
    body('favoriteBooks.*.price', "Name must be a string")
        .isNumeric()
]


export const step1Validation = [
    body('name', "Name must be a string")
        .isLength({ min: 1 }),
    body('age', "age must be a integer")
        .isInt()
]

export const step2Validation = [
    body('name', "Name must be a string")
        .isLength({ min: 1 }),
    body('age', "age must be a integer")
        .isInt()
]

export const step3Validation = [
    body('name', "Name must be a string")
        .isLength({ min: 1 }),
    body('age', "age must be a integer")
        .isInt()
]
