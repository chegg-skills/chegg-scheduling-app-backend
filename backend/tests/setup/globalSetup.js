"use strict";

const path = require("path");
const { execSync } = require("child_process");
const { Client } = require("pg");

require("dotenv").config({
  path: path.resolve(__dirname, "../../.env.test"),
  override: true,
});

module.exports = async function globalSetup() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("[globalSetup] DATABASE_URL is not set in .env.test");
  }

  const url = new URL(dbUrl);
  // Strip query string from pathname to get the raw DB name
  const dbName = decodeURIComponent(url.pathname.slice(1).split("?")[0]);

  // Connect to the maintenance DB ("postgres") to create the test DB if needed
  const maintenanceUrl = new URL(dbUrl);
  maintenanceUrl.pathname = "/postgres";
  maintenanceUrl.search = "";

  const client = new Client({ connectionString: maintenanceUrl.toString() });
  await client.connect();

  const { rows } = await client.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [dbName]
  );

  if (rows.length === 0) {
    await client.query(`CREATE DATABASE "${dbName}"`);
    console.log(`[globalSetup] Created test database: ${dbName}`);
  }

  await client.end();

  // Sync schema with the test DB
  console.log("[globalSetup] Syncing database schema...");
  execSync("npx prisma db push --accept-data-loss", {
    env: { ...process.env },
    stdio: "inherit",
  });
  console.log("[globalSetup] Database synchronized successfully.");
};
