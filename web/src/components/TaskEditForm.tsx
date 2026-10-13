"use client";

import type { FormEvent } from "react";
import type { Task } from "@/lib/api";
import type { TaskFormErrors, TaskFormValues } from "@/lib/tasks/validation";
import { FormField } from "./FormField";

export interface TaskEditFormProps {
  task: Task;
  values: TaskFormValues;
  errors: TaskFormErrors;
  saving: boolean;
  onChange: (field: keyof TaskFormValues, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}

export function TaskEditForm({
  task,
  values,
  errors,
  saving,
  onChange,
  onSubmit,
  onCancel,
}: TaskEditFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      noValidate
      aria-label={`Edit "${task.title}"`}
      className="flex flex-col gap-3"
    >
      <FormField
        id={`task-${task.id}-title`}
        label="Title"
        value={values.title}
        onChange={(value) => onChange("title", value)}
        error={errors.title}
      />
      <FormField
        id={`task-${task.id}-description`}
        label="Description (optional)"
        value={values.description}
        onChange={(value) => onChange("description", value)}
        error={errors.description}
        required={false}
        multiline
      />
      <FormField
        id={`task-${task.id}-due-date`}
        label="Due date (optional)"
        type="date"
        value={values.dueDate}
        onChange={(value) => onChange("dueDate", value)}
        error={errors.dueDate}
        required={false}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-md border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
