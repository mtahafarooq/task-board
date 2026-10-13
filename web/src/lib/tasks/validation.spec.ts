import type { Task } from "@/lib/api";
import {
  EMPTY_TASK_FORM,
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
  taskToFormValues,
  toCreateTaskInput,
  toUpdateTaskInput,
  validateTaskForm,
} from "./validation";

describe("validateTaskForm", () => {
  it("requires a nonempty title", () => {
    expect(validateTaskForm(EMPTY_TASK_FORM)).toEqual({
      title: "Title is required.",
    });
  });

  it("treats a whitespace-only title as empty", () => {
    expect(
      validateTaskForm({ title: "   ", description: "", dueDate: "" }),
    ).toEqual({ title: "Title is required." });
  });

  it("accepts a title at the maximum length and rejects one over it", () => {
    const atLimit = "a".repeat(MAX_TITLE_LENGTH);
    const overLimit = "a".repeat(MAX_TITLE_LENGTH + 1);

    expect(
      validateTaskForm({ title: atLimit, description: "", dueDate: "" }),
    ).toEqual({});
    expect(
      validateTaskForm({ title: overLimit, description: "", dueDate: "" }),
    ).toEqual({
      title: `Title must be ${MAX_TITLE_LENGTH} characters or fewer.`,
    });
  });

  it("rejects a description over the maximum length", () => {
    const overLimit = "d".repeat(MAX_DESCRIPTION_LENGTH + 1);

    expect(
      validateTaskForm({ title: "Task", description: overLimit, dueDate: "" }),
    ).toEqual({
      description: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`,
    });
  });

  it("accepts an empty or valid due date and rejects an invalid one", () => {
    expect(
      validateTaskForm({ title: "Task", description: "", dueDate: "" }),
    ).toEqual({});
    expect(
      validateTaskForm({
        title: "Task",
        description: "",
        dueDate: "2030-01-02",
      }),
    ).toEqual({});
    expect(
      validateTaskForm({ title: "Task", description: "", dueDate: "nope" }),
    ).toEqual({ dueDate: "Enter a valid date." });
  });
});

describe("toCreateTaskInput", () => {
  it("trims the title and omits empty optional fields", () => {
    expect(
      toCreateTaskInput({
        title: "  Write report  ",
        description: "  ",
        dueDate: "",
      }),
    ).toEqual({ title: "Write report" });
  });

  it("includes the description and an ISO due date when provided", () => {
    expect(
      toCreateTaskInput({
        title: "Write report",
        description: "Include numbers",
        dueDate: "2030-01-02",
      }),
    ).toEqual({
      title: "Write report",
      description: "Include numbers",
      dueDate: "2030-01-02T00:00:00.000Z",
    });
  });
});

const task: Task = {
  id: "task-1",
  title: "Write the report",
  description: "Include the Q4 numbers",
  dueDate: "2030-01-02T00:00:00.000Z",
  completed: false,
  ownerId: "user-1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("taskToFormValues", () => {
  it("maps a task into editable form values", () => {
    expect(taskToFormValues(task)).toEqual({
      title: "Write the report",
      description: "Include the Q4 numbers",
      dueDate: "2030-01-02",
    });
  });

  it("uses empty strings for absent optional fields", () => {
    expect(
      taskToFormValues({
        ...task,
        description: null,
        dueDate: null,
      }),
    ).toEqual({ title: "Write the report", description: "", dueDate: "" });
  });
});

describe("toUpdateTaskInput", () => {
  it("trims the title and sends nulls to clear empty optional fields", () => {
    expect(
      toUpdateTaskInput({
        title: "  Write report  ",
        description: "   ",
        dueDate: "",
      }),
    ).toEqual({
      title: "Write report",
      description: null,
      dueDate: null,
    });
  });

  it("includes the description and an ISO due date when provided", () => {
    expect(
      toUpdateTaskInput({
        title: "Write report",
        description: "Include numbers",
        dueDate: "2030-01-02",
      }),
    ).toEqual({
      title: "Write report",
      description: "Include numbers",
      dueDate: "2030-01-02T00:00:00.000Z",
    });
  });
});
