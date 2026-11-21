import assert from "node:assert/strict";
import { it } from "node:test";
import { repairOpenUiProps as fix } from "./propRepair";
import { finalContentProps } from "./contentContracts";

it("moves a value that landed one positional slot early to the slot that accepts it", () => {
  const versus = fix("Versus", { a: {}, b: {}, title: "T", variant: "Pilih A kalau butuh energi." });
  assert.equal(versus.variant, undefined);
  assert.equal(versus.verdict, "Pilih A kalau butuh energi.");

  const recipe = fix("RecipeScalerCard", {
    title: "Rendang",
    ingredients: [],
    imageQuery: "https://example.com/rendang.jpg",
    src: "Tips: jangan sering diaduk.",
  });
  assert.equal(recipe.src, "https://example.com/rendang.jpg");
  assert.equal(recipe.tip, "Tips: jangan sering diaduk.");
  assert.equal(recipe.imageQuery, undefined);
});

it("leaves well-formed and still-streaming props untouched", () => {
  const ok = { a: {}, b: {}, variant: "radar", verdict: "x" };
  assert.equal(fix("Versus", ok), ok);
  assert.equal(fix("Versus", { a: {}, b: {}, variant: "ca" }).variant, "ca");
});

it("accepts imageUrl on list items and re-keys table rows to their columns", () => {
  const cards = fix("Cards", { items: [{ title: "A", imageUrl: "https://example.com/a.jpg" }, { title: "B", imageUrl: null }] });
  assert.deepEqual((cards.items as Array<{ image?: string }>).map((i) => i.image), ["https://example.com/a.jpg", undefined]);

  const table = fix("Table", { columns: ["Kategori", "Harga Resmi"], rows: [{ kategori: "A", harga_resmi: "Rp1" }] });
  assert.deepEqual(finalContentProps("Table", table)?.rows, [["A", "Rp1"]]);
  assert.deepEqual(fix("Followups", { items: [{ text: "Lanjut?" }, "Lagi?"] }).items, ["Lanjut?", "Lagi?"]);
});

it("reads chart values written as formatted text", () => {
  const pie = fix("PieChart", { title: "Budget", data: [{ label: "Kebutuhan", value: "50%" }, { label: "Tabungan", value: "Rp 2.400.000" }] });
  assert.deepEqual((pie.data as Array<{ value: number }>).map((d) => d.value), [50, 2400000]);
  assert.ok(finalContentProps("Chart", fix("Chart", { data: [{ label: "A", value: "1,5" }] })));
  const text = { data: [{ label: "A", value: "sekitar 5" }] };
  assert.equal(fix("Chart", text), text);
});

it("keeps off-list single-word options and treats short text in a photo slot as a query", () => {
  const callout = { text: "Catatan", tone: "info" };
  assert.equal(fix("Callout", callout), callout);
  const headline = fix("Headline", { title: "Raja Ampat", image: "Raja Ampat aerial" });
  assert.equal(headline.image, undefined);
  assert.equal(headline.imageQuery, "Raja Ampat aerial");
});
