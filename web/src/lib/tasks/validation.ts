import type { CreateTaskInput, Task, UpdateTaskInput } from "@/lib/api";

export interface TaskFormValues {
  title: string;
  description: string;
  dueDate: string;
}

export interface TaskFormErrors {
  title?: string;
  description?: string;
  dueDate?: string;
}

export const EMPTY_TASK_FORM: TaskFormValues = {
  title: "",
  description: "",
  dueDate: "",
};

export const MAX_TITLE_LENGTH = 200;
export const MAX_DESCRIPTION_LENGTH = 2000;

export function validateTaskForm(values: TaskFormValues): TaskFormErrors {
  const errors: TaskFormErrors = {};

  const title = values.title.trim();
  if (!title) {
    errors.title = "Title is required.";
  } else if (title.length > MAX_TITLE_LENGTH) {
    errors.title = `Title must be ${MAX_TITLE_LENGTH} characters or fewer.`;
  }

  if (values.description.trim().length > MAX_DESCRIPTION_LENGTH) {
    errors.description = `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`;
  }

  if (values.dueDate && !isValidDateInput(values.dueDate)) {
    errors.dueDate = "Enter a valid date.";
  }

  return errors;
}

export function toCreateTaskInput(values: TaskFormValues): CreateTaskInput {
  const input: CreateTaskInput = { title: values.title.trim() };

  const description = values.description.trim();
  if (description) {
    input.description = description;
  }

  if (values.dueDate) {
    input.dueDate = dateInputToIso(values.dueDate);
  }

  return input;
}

export function taskToFormValues(task: Task): TaskFormValues {
  return {
    title: task.title,
    description: task.description ?? "",
    dueDate: task.dueDate ? isoToDateInput(task.dueDate) : "",
  };
}

export function toUpdateTaskInput(values: TaskFormValues): UpdateTaskInput {
  const description = values.description.trim();

  return {
    title: values.title.trim(),
    description: description ? description : null,
    dueDate: values.dueDate ? dateInputToIso(values.dueDate) : null,
  };
}

function isValidDateInput(value: string): boolean {
  return !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime());
}

function dateInputToIso(value: string): string {
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

function isoToDateInput(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString().slice(0, 10);
}
