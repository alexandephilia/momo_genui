import assert from "node:assert/strict";
import { it } from "node:test";
import { parseFigureLine } from "./figureLine";

it("parses align + kind tokens in the title attribute", () => {
  assert.deepEqual(parseFigureLine('![A: d](u1 "left summary")'), {
    alt: "A: d", url: "u1", align: "left", kind: "summary",
  });
  assert.deepEqual(parseFigureLine('![K: e1 | e2](u2 "kronologi")'), {
    alt: "K: e1 | e2", url: "u2", align: "full", kind: "kronologi",
  });
  assert.deepEqual(parseFigureLine('![A](u3 "kanan ringkasan")'), {
    alt: "A", url: "u3", align: "right", kind: "summary",
  });
  assert.deepEqual(parseFigureLine('![A](u4 "right")'), {
    alt: "A", url: "u4", align: "right", kind: "plain",
  });
  assert.deepEqual(parseFigureLine("![bare](u5)"), {
    alt: "bare", url: "u5", align: "full", kind: "plain",
  });
  assert.equal(parseFigureLine("not a figure"), null);
});
