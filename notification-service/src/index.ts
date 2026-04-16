import "dotenv/config";
import { bootstrap } from "./app/bootstrap";

bootstrap().catch((err: unknown) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
