import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("payment repository security controls exist", async () => {
  for (const path of [".github/CODEOWNERS", ".github/dependabot.yml", "SECURITY.md"]) {
    assert.ok((await read(path)).trim().length > 0, `${path} must exist`);
  }
});

test("workflows pin external actions and do not persist checkout credentials", async () => {
  const dir = new URL("../.github/workflows/", import.meta.url);
  const files = (await readdir(dir)).filter((name) => /\.ya?ml$/i.test(name));
  const violations = [];
  for (const file of files) {
    const source = await read(`.github/workflows/${file}`);
    if (/actions\/checkout@/i.test(source) && !/persist-credentials:\s*false/.test(source)) {
      violations.push(`${file}: checkout persists credentials`);
    }
    for (const [index, line] of source.split("\n").entries()) {
      const match = line.match(/^\s*uses:\s*([^\s#]+)(?:\s+#.*)?$/);
      if (!match) continue;
      const ref = match[1];
      if (ref.startsWith("./") || ref.startsWith("docker://")) continue;
      if (!/@[0-9a-f]{40}$/i.test(ref)) violations.push(`${file}:${index + 1}: ${ref}`);
    }
  }
  assert.deepEqual(violations, [], `Supply-chain violations:\n${violations.join("\n")}`);
});

test("CI audits production dependencies at HIGH and the full graph from LOW", async () => {
  const workflow = await read(".github/workflows/ci.yml");
  assert.match(workflow, /npm audit --omit=dev --audit-level=high/);
  assert.match(workflow, /npm audit --audit-level=low/);
});
