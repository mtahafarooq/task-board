"use client";

import { useState, type FormEvent } from "react";
import type { Task, UpdateTaskInput } from "@/lib/api";
import { formatDueDate } from "@/lib/tasks/format";
import {
  taskToFormValues,
  toUpdateTaskInput,
  validateTaskForm,
  type TaskFormErrors,
  type TaskFormValues,
} from "@/lib/tasks/validation";
import { TaskEditForm } from "./TaskEditForm";

export interface TaskItemActions {
  onToggle(task: Task): Promise<void>;
  onSave(id: string, input: UpdateTaskInput): Promise<void>;
  onDelete(id: string): Promise<void>;
}

export interface TaskItemProps {
  task: Task;
  actions: TaskItemActions;
}

export function TaskItem({ task, actions }: TaskItemProps) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [values, setValues] = useState<TaskFormValues>(() =>
    taskToFormValues(task),
  );
  const [errors, setErrors] = useState<TaskFormErrors>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);

  function startEditing() {
    setValues(taskToFormValues(task));
    setErrors({});
    setConfirmingDelete(false);
    setEditing(true);
  }

  function handleChange(field: keyof TaskFormValues, value: string) {
    setValues((previous) => ({ ...previous, [field]: value }));
  }

  async function handleToggle() {
    setToggling(true);
    try {
      await actions.onToggle(task);
    } catch {
      // The board surfaces the failure; the optimistic state is rolled back there.
    } finally {
      setToggling(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateTaskForm(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSaving(true);
    try {
      await actions.onSave(task.id, toUpdateTaskInput(values));
      setEditing(false);
      setErrors({});
    } catch {
      // Keep the form open so the entered values are not lost on failure.
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await actions.onDelete(task.id);
    } catch {
      // The board surfaces the failure; keep the confirmation open to retry.
    } finally {
      setDeleting(false);
    }
  }

  if (editing) {
    return (
      <li className="rounded-lg border border-blue-200 bg-white p-4">
        <TaskEditForm
          task={task}
          values={values}
          errors={errors}
          saving={saving}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onCancel={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <input
            id={`task-${task.id}-done`}
            type="checkbox"
            checked={task.completed}
            disabled={toggling}
            onChange={handleToggle}
            aria-label={
              task.completed
                ? `Mark "${task.title}" as incomplete`
                : `Mark "${task.title}" as complete`
            }
            className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex min-w-0 flex-col gap-1">
            <label
              htmlFor={`task-${task.id}-done`}
              className={
                task.completed
                  ? "font-medium text-gray-500 line-through"
                  : "font-medium text-gray-900"
              }
            >
              {task.title}
            </label>
            {task.description ? (
              <span className="text-sm break-words text-gray-600">
                {task.description}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 text-sm">
          {task.dueDate ? (
            <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-600">
              Due {formatDueDate(task.dueDate)}
            </span>
          ) : null}
          <span
            className={
              task.completed
                ? "rounded-full bg-green-100 px-2 py-1 text-green-700"
                : "rounded-full bg-blue-100 px-2 py-1 text-blue-700"
            }
          >
            {task.completed ? "Completed" : "Open"}
          </span>
        </div>
      </div>

      {confirmingDelete ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3 text-sm">
          <span className="text-gray-700">Delete this task?</span>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-md bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none disabled:opacity-60"
          >
            {deleting ? "Deleting..." : "Confirm"}
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDelete(false)}
            disabled={deleting}
            className="rounded-md border border-gray-300 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-3 text-sm">
          <button
            type="button"
            onClick={startEditing}
            aria-label={`Edit "${task.title}"`}
            className="rounded-md border border-gray-300 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            aria-label={`Delete "${task.title}"`}
            className="rounded-md border border-red-300 px-3 py-1.5 font-medium text-red-700 hover:bg-red-50 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none"
          >
            Delete
          </button>
        </div>
      )}
    </li>
  );
}
