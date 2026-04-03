import path from "path";
import dotenv from "dotenv";

// Load .env.test so every test worker uses the test database
dotenv.config({
  path: path.resolve(__dirname, "../../.env.test"),
  override: true,
});
