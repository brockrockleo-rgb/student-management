import "dotenv/config";
import { defineConfig } from "@mikro-orm/mongodb";
import { ReflectMetadataProvider } from "@mikro-orm/decorators/legacy";
import { BaseEntity,entities } from "./entities";

export default defineConfig({
  clientUrl: process.env.MONGODB_URI ?? "mongodb://localhost:27017/student_management",
  dbName: process.env.MONGODB_DB_NAME ?? "student_management",
  entities:[BaseEntity, ...entities,],
  metadataProvider: ReflectMetadataProvider,
  ensureIndexes: process.env.MONGODB_ENSURE_INDEXES !== "false",
  implicitTransactions: false,
  debug: process.env.NODE_ENV === "development",
});
