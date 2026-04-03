import { Router, type IRouter } from "express";
import healthRouter from "./health";
import questionsRouter from "./questions/index";
import speakRouter from "./questions/speak";
import extractRouter from "./questions/extract";

const router: IRouter = Router();

router.use(healthRouter);
router.use(questionsRouter);
router.use(speakRouter);
router.use(extractRouter);

export default router;
