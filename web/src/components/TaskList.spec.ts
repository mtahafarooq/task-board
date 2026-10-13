import { ApiError } from "@/lib/api";
import type { Task } from "@/lib/api";
import {
  applyCompleted,
  taskActionErrorMessage,
  taskErrorMessage,
  tasksQueryKey,
} from "./TaskList";

const task: Task = {
  id: "task-1",
  title: "Write the report",
  description: null,
  dueDate: null,
  completed: false,
  ownerId: "user-1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("tasksQueryKey", () => {
  it("includes the user id so cached tasks never leak between users", () => {
    expect(tasksQueryKey("user-1")).toEqual(["tasks", "user-1"]);
    expect(tasksQueryKey(null)).toEqual(["tasks", "anonymous"]);
  });
});

describe("taskErrorMessage", () => {
  it("uses the API error messages when available", () => {
    const error = new ApiError({
      statusCode: 500,
      error: "Internal Server Error",
      message: ["Database unavailable"],
    });

    expect(taskErrorMessage(error)).toBe(
      "We couldn't load your tasks: Database unavailable",
    );
  });

  it("falls back to a generic message for unknown errors", () => {
    expect(taskErrorMessage(new Error("boom"))).toBe(
      "We couldn't load your tasks. Please try again.",
    );
  });
});

describe("taskActionErrorMessage", () => {
  it("describes an update failure with the API messages", () => {
    const error = new ApiError({
      statusCode: 400,
      error: "Bad Request",
      message: ["title should not be empty"],
    });

    expect(taskActionErrorMessage(error, "update")).toBe(
      "We couldn't update that task: title should not be empty",
    );
  });

  it("describes a delete failure and falls back for unknown errors", () => {
    expect(taskActionErrorMessage(new Error("boom"), "delete")).toBe(
      "We couldn't delete that task. Please try again.",
    );
  });
});

describe("applyCompleted", () => {
  it("updates only the matching task's completion state", () => {
    const other = { ...task, id: "task-2" };

    expect(applyCompleted([task, other], "task-1", true)).toEqual([
      { ...task, completed: true },
      other,
    ]);
  });

  it("leaves the list unchanged when no task matches", () => {
    expect(applyCompleted([task], "missing", true)).toEqual([task]);
  });
});
