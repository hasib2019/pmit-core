import express, { NextFunction, Request, Response, Router } from "express";
import { wrap } from "../../../middlewares/wraps.middle";

import { auth } from "../../user/middlewares/auth.middle";
import SavingsProductService from "../services/savings-product.service";
import Container from "typedi";

const router: Router = express.Router();

router.get("/approved-savings-product/:productId", [auth(["*"])],
    wrap(async (req: Request, res: Response, next: NextFunction) => {
        const savingsProductService: SavingsProductService = Container.get(SavingsProductService);
        let result;
        result = await savingsProductService.getApprovedSingleProduct(Number(req.params.productId));

        res.status(200).json({
            message: "request Successful",
            data: result,
        });
    })
)

export { router as savingsRouter };

