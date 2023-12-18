import { Request, Response, NextFunction } from "express";

import Container from "typedi";
import BadRequestError from "../../../errors/bad-request.error";
import { ProductService } from "../services/product/product.service";

const productUpdateMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const productService: ProductService = Container.get(ProductService);
  const isAllowed = await productService.checkIsProjectChangeAllowedInEdit(
    parseInt(req.params.id),
    parseInt(req.body.projectId)
  );
  if (isAllowed) {
    next();
  } else {
    next(
      new BadRequestError(`প্রজেক্ট আইডি পরিবর্তন সম্ভব নয় 
    ( এই প্রোডাক্ট এবং প্রজেক্ট আইডি দিয়ে একাউন্ট তৈরী হয়ে গিয়েছে ) `)
    );
  }
};
export default productUpdateMiddleware;
