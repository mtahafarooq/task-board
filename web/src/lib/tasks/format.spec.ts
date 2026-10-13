import { formatDueDate } from "./format";

describe("formatDueDate", () => {
  it("formats an ISO timestamp as a short, readable date", () => {
    expect(formatDueDate("2030-01-02T00:00:00.000Z")).toContain("2030");
    expect(formatDueDate("2030-01-02T00:00:00.000Z")).toContain("Jan");
  });

  it("returns the original value when it is not a valid date", () => {
    expect(formatDueDate("not-a-date")).toBe("not-a-date");
  });
});
