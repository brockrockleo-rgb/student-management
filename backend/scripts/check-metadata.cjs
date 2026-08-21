require("reflect-metadata");
const { MikroORM } = require("@mikro-orm/mongodb");
const config = require("../dist/mikro-orm.config").default;

const expectedEntities = [
  "Department",
  "SchoolClass",
  "Student",
  "Teacher",
  "Permission",
  "PositionPermission",
  "User",
];

(async () => {
  const orm = await MikroORM.init({ ...config, connect: false, ensureIndexes: false });
  const missing = expectedEntities.filter((name) => !orm.getMetadata().find(name));
  const student = orm.getMetadata().get("Student");

  console.log(JSON.stringify({
    driver: orm.driver.constructor.name,
    entities: expectedEntities.length,
    missing,
    primaryKey: student.primaryKeys,
    uniqueIndexes: student.uniques,
  }, null, 2));

  await orm.close(true);
  if (missing.length) process.exit(1);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
