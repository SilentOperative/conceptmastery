import { Router, type IRouter } from "express";
import healthRouter from "./health";
import questionsRouter from "./questions/index";
import speakRouter from "./questions/speak";

const router: IRouter = Router();

router.use(healthRouter);
router.use(questionsRouter);
router.use(speakRouter);

export default router;
