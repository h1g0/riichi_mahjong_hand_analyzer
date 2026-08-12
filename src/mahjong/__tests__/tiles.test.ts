import { describe, expect, it } from "vitest";
import { calledTilePosition, parseMeld } from "../tiles";

describe("meld presentation", () => {
  it("detects chi, pon and kan from tile input", () => {
    expect(parseMeld("123m")?.type).toBe("chi");
    expect(parseMeld("777p")?.type).toBe("pon");
    expect(parseMeld("1111z")?.type).toBe("kan");
  });

  it("preserves a concealed kan as closed", () => {
    expect(parseMeld("5555s", false)).toMatchObject({ type: "kan", open: false });
  });

  it("places a pon's called tile according to the discarder", () => {
    expect(calledTilePosition("pon", "left")).toBe(0);
    expect(calledTilePosition("pon", "opposite")).toBe(1);
    expect(calledTilePosition("pon", "right")).toBe(2);
  });

  it("places a kan called from the right at its far edge", () => {
    expect(calledTilePosition("kan", "left")).toBe(0);
    expect(calledTilePosition("kan", "opposite")).toBe(1);
    expect(calledTilePosition("kan", "right")).toBe(3);
  });

  it("always shows chi as called from the left", () => {
    expect(calledTilePosition("chi", "right")).toBe(0);
  });
});
