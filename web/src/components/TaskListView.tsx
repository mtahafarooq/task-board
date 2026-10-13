"use client";

import type { Task } from "@/lib/api";
import { TaskItem, type TaskItemActions } from "./TaskItem";

export type TaskListViewState =
  | { status: "loading" }
  | { status: "error"; message: string; onRetry: () => void }
  | { status: "ready"; tasks: Task[] };

const NOOP_ACTIONS: TaskItemActions = {
  onToggle: async () => {},
  onSave: async () => {},
  onDelete: async () => {},
};

export interface TaskListViewProps {
  state: TaskListViewState;
  actions?: TaskItemActions;
}

export function TaskListView({
  state,
  actions = NOOP_ACTIONS,
}: TaskListViewProps) {
  if (state.status === "loading") {
    return (
      <section
        aria-busy="true"
        aria-label="Your tasks"
        className="rounded-lg border border-gray-200 bg-white p-6"
      >
        <p role="status" className="text-gray-600">
          Loading your tasks...
        </p>
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <section
        aria-label="Your tasks"
        className="flex flex-col items-start gap-4 rounded-lg border border-red-200 bg-red-50 p-6"
      >
        <p role="alert" className="text-red-700">
          {state.message}
        </p>
        <button
          type="button"
          onClick={state.onRetry}
          className="rounded-md border border-red-300 bg-white px-4 py-2 font-medium text-red-700 hover:bg-red-100 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none"
        >
          Try again
        </button>
      </section>
    );
  }

  if (state.tasks.length === 0) {
    return (
      <section
        aria-label="Your tasks"
        className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-gray-600"
      >
        <p className="font-medium text-gray-800">No tasks yet</p>
        <p className="mt-1 text-sm">
          Tasks you add will show up here once you create them.
        </p>
      </section>
    );
  }

  return (
    <ul aria-label="Your tasks" className="flex flex-col gap-3">
      {state.tasks.map((task) => (
        <TaskItem key={task.id} task={task} actions={actions} />
      ))}
    </ul>
  );
}
