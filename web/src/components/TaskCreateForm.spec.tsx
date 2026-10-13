import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { ApiError } from "@/lib/api";
import { createTaskErrorMessage, TaskCreateForm } from "./TaskCreateForm";

function render(): string {
  const queryClient = new QueryClient();
  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <TaskCreateForm />
    </QueryClientProvider>,
  );
}

describe("TaskCreateForm", () => {
  it("renders a labelled title field, optional details, and a submit button", () => {
    const html = render();

    expect(html).toContain('for="task-title"');
    expect(html).toContain("Title");
    expect(html).toContain('id="task-title"');
    expect(html).toContain('required=""');

    expect(html).toContain("<textarea");
    expect(html).toContain("Description (optional)");
    expect(html).toContain('for="task-due-date"');
    expect(html).toContain('type="date"');
    expect(html).toContain("Due date (optional)");

    expect(html).toContain("Add task");
    expect(html).toContain('type="submit"');
  });
});

describe("createTaskErrorMessage", () => {
  it("uses the API error messages when available", () => {
    const error = new ApiError({
      statusCode: 400,
      error: "Bad Request",
      message: ["title should not be empty"],
    });

    expect(createTaskErrorMessage(error)).toBe(
      "We couldn't create your task: title should not be empty",
    );
  });

  it("falls back to a generic message for unknown errors", () => {
    expect(createTaskErrorMessage(new Error("boom"))).toBe(
      "We couldn't create your task. Please try again.",
    );
  });
});
