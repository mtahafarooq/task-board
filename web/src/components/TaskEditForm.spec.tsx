import { renderToStaticMarkup } from "react-dom/server";
import type { Task } from "@/lib/api";
import { TaskEditForm } from "./TaskEditForm";

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

function render(errors: { title?: string } = {}): string {
  return renderToStaticMarkup(
    <TaskEditForm
      task={task}
      values={{
        title: "Write the report",
        description: "Include the Q4 numbers",
        dueDate: "2030-01-02",
      }}
      errors={errors}
      saving={false}
      onChange={() => {}}
      onSubmit={() => {}}
      onCancel={() => {}}
    />,
  );
}

describe("TaskEditForm", () => {
  it("renders the task's fields pre-filled as an accessible form", () => {
    const html = render();

    expect(html).toContain('aria-label="Edit &quot;Write the report&quot;"');
    expect(html).toContain('for="task-task-1-title"');
    expect(html).toContain('id="task-task-1-title"');
    expect(html).toContain('value="Write the report"');
    expect(html).toContain("<textarea");
    expect(html).toContain("Include the Q4 numbers");
    expect(html).toContain('type="date"');
    expect(html).toContain('value="2030-01-02"');

    expect(html).toContain("Save changes");
    expect(html).toContain("Cancel");
  });

  it("shows field errors as alerts", () => {
    const html = render({ title: "Title is required." });

    expect(html).toContain('role="alert"');
    expect(html).toContain("Title is required.");
    expect(html).toContain('aria-invalid="true"');
  });
});
