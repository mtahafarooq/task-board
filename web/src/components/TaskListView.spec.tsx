import { renderToStaticMarkup } from "react-dom/server";
import type { Task } from "@/lib/api";
import { TaskListView, type TaskListViewState } from "./TaskListView";

const baseTask: Task = {
  id: "task-1",
  title: "Write the report",
  description: null,
  dueDate: null,
  completed: false,
  ownerId: "user-1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function render(state: TaskListViewState): string {
  return renderToStaticMarkup(<TaskListView state={state} />);
}

describe("TaskListView", () => {
  it("renders a loading status while the query is pending", () => {
    const html = render({ status: "loading" });

    expect(html).toContain('role="status"');
    expect(html).toContain("Loading your tasks");
    expect(html).toContain('aria-busy="true"');
  });

  it("renders an alert with a retry button when loading fails", () => {
    const html = render({
      status: "error",
      message: "Could not load your tasks.",
      onRetry: () => {},
    });

    expect(html).toContain('role="alert"');
    expect(html).toContain("Could not load your tasks.");
    expect(html).toContain("Try again");
    expect(html).toContain("<button");
  });

  it("renders an empty state when the user has no tasks", () => {
    const html = render({ status: "ready", tasks: [] });

    expect(html).toContain("No tasks yet");
    expect(html).not.toContain("<ul");
  });

  it("renders each task with its title and completion state", () => {
    const html = render({
      status: "ready",
      tasks: [
        { ...baseTask, id: "a", title: "Write the report" },
        {
          ...baseTask,
          id: "b",
          title: "Ship the release",
          completed: true,
        },
      ],
    });

    expect(html).toContain("<ul");
    expect(html).toContain('aria-label="Your tasks"');
    expect(html).toContain("Write the report");
    expect(html).toContain("Ship the release");
    expect(html).toContain("Open");
    expect(html).toContain("Completed");
  });

  it("renders completion, edit, and delete controls for each task", () => {
    const html = render({
      status: "ready",
      tasks: [
        { ...baseTask, id: "a", title: "Write the report" },
        { ...baseTask, id: "b", title: "Ship the release", completed: true },
      ],
    });

    expect(html).toContain('type="checkbox"');
    expect(html).toContain(
      'aria-label="Mark &quot;Write the report&quot; as complete"',
    );
    expect(html).toContain(
      'aria-label="Mark &quot;Ship the release&quot; as incomplete"',
    );
    expect(html).toContain('aria-label="Edit &quot;Write the report&quot;"');
    expect(html).toContain('aria-label="Delete &quot;Write the report&quot;"');
    expect(html).toContain(">Edit<");
    expect(html).toContain(">Delete<");
  });

  it("renders the description and a formatted due date when present", () => {
    const html = render({
      status: "ready",
      tasks: [
        {
          ...baseTask,
          description: "Include the Q4 numbers",
          dueDate: "2026-02-03T00:00:00.000Z",
        },
      ],
    });

    expect(html).toContain("Include the Q4 numbers");
    expect(html).toContain("Due");
    expect(html).toContain("2026");
  });
});
