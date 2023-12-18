/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2023-07-25 11:01:24
 * @modify date 2023-07-25 11:01:24
 * @desc [description]
 */

import { NextFunction, Request, Response } from "express";
import { verifyApiKey } from "../services/verify.service";

export async function authExternalAPI(req: Request, res: Response, next: NextFunction) {
  // Get the API key from the request headers, query params, or body (depending on how you send it)
  const apiKey = req.headers["api-key"] || req.query.apiKey || req.body.apiKey;

  const originalRoutePath = req.originalUrl.split("?")[0];
  const method = req.method.toLocaleLowerCase();

  if (!apiKey) {
    return res.status(401).json({ error: "Authentication required. Please provide an API key." });
  }

  // Verify the API key
  if (!(await verifyApiKey(apiKey, originalRoutePath, method))) {
    return res.status(403).json({ error: "Invalid API key or Route." });
  }

  // If the API key is valid, proceed to the next middleware or route handler
  next();
}
