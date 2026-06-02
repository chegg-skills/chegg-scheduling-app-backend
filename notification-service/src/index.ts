import "dotenv/config";
import { bootstrap } from "./app/bootstrap";
import { logger } from "./logger";

bootstrap().catch((err: unknown) => {
  logger.fatal({ error: err }, "Fatal startup error.");
  process.exit(1);
});
