import assert from "node:assert/strict";
import { it } from "node:test";
import { decideRoleTurn } from "./localBrain";

it("gates the requested work, even if its subject matches the locked role", () => {
  for (const text of [
    "Bantu gue coding Python",
    "Bikinin website buat gue",
    "Bikin aplikasi resep pakai React dan TypeScript",
  ]) {
    assert.deepEqual(decideRoleTurn(text, "cook"), { kind: "needs_handoff", suggestedLook: "builder" });
  }
  assert.deepEqual(decideRoleTurn("Kenapa React hydration error?", "cook"), {
    kind: "needs_handoff", suggestedLook: "bug",
  });
});

it("keeps culinary work and adjacent travel budgeting in role", () => {
  for (const text of ["Kenapa adonan gagal mengembang?", "Bikin resep untuk website gue", "Bikin versi tanpa susu"]) {
    assert.equal(decideRoleTurn(text, "cook", "Cara bikin latte?").kind, "answer");
  }
  assert.equal(decideRoleTurn("Budget hotel Bandung berapa?", "traveller").kind, "answer");
  assert.equal(decideRoleTurn("Bikinin website", "rest").kind, "answer");
  assert.equal(decideRoleTurn("Bikinin website", undefined).kind, "answer");
});

it("asks before mixed work and resolves explicit continuations against the previous task", () => {
  assert.deepEqual(decideRoleTurn("Website resep?", "cook"), { kind: "clarify", suggestedLook: "builder" });
  assert.equal(decideRoleTurn("Lanjutin yang tadi", "cook", "Bikinin website resep").kind, "needs_handoff");
  assert.equal(decideRoleTurn("Lanjutin yang tadi", "cook", "Bikin resep untuk website").kind, "answer");
});
