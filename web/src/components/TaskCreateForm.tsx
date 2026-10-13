"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { ApiError, apiClient } from "@/lib/api";
import type { ApiClient } from "@/lib/api";
import {
  EMPTY_TASK_FORM,
  toCreateTaskInput,
  validateTaskForm,
  type TaskFormErrors,
  type TaskFormValues,
} from "@/lib/tasks/validation";
import { FormField } from "./FormField";

export function createTaskErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.messages.length > 0) {
    return `We couldn't create your task: ${error.messages.join(" ")}`;
  }
  return "We couldn't create your task. Please try again.";
}

export interface TaskCreateFormProps {
  client?: ApiClient;
}

export function TaskCreateForm({ client = apiClient }: TaskCreateFormProps) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<TaskFormValues>(EMPTY_TASK_FORM);
  const [errors, setErrors] = useState<TaskFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (input: ReturnType<typeof toCreateTaskInput>) =>
      client.createTask(input),
    onSuccess: () => {
      setValues(EMPTY_TASK_FORM);
      setErrors({});
      setFormError(null);
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error) => {
      setFormError(createTaskErrorMessage(error));
    },
  });

  function update(field: keyof TaskFormValues) {
    return (value: string) =>
      setValues((previous) => ({ ...previous, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const nextErrors = validateTaskForm(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    mutation.mutate(toCreateTaskInput(values));
  }

  return (
    <section
      aria-label="Add a task"
      className="rounded-lg border border-gray-200 bg-white p-6"
    >
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Add a task</h2>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {formError ? (
          <p
            role="alert"
            className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {formError}
          </p>
        ) : null}

        <FormField
          id="task-title"
          label="Title"
          value={values.title}
          onChange={update("title")}
          error={errors.title}
        />
        <FormField
          id="task-description"
          label="Description (optional)"
          value={values.description}
          onChange={update("description")}
          error={errors.description}
          required={false}
          multiline
        />
        <FormField
          id="task-due-date"
          label="Due date (optional)"
          type="date"
          value={values.dueDate}
          onChange={update("dueDate")}
          error={errors.dueDate}
          required={false}
        />

        <button
          type="submit"
          disabled={mutation.isPending}
          className="self-start rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:opacity-60"
        >
          {mutation.isPending ? "Adding..." : "Add task"}
        </button>
      </form>
    </section>
  );
}
