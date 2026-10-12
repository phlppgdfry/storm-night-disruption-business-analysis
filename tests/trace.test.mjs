// The traceability chain has no orphans and no dangling IDs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkTrace } from "../scripts/check-trace.mjs";

test("traceability: voice → pain → goal → KPI → rule → story → example / BAT → screen", () => {
  const { errors } = checkTrace();
  assert.deepEqual(errors, []);
});
