"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ApiError, apiClient } from "@/lib/api";
import type { ApiClient, Paginated, Task, UpdateTaskInput } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { TaskItemActions } from "./TaskItem";
import { TaskListView, type TaskListViewState } from "./TaskListView";

export const TASK_PAGE_LIMIT = 100;

export function tasksQueryKey(userId: string | null) {
  return ["tasks", userId ?? "anonymous"] as const;
}

export function taskErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.messages.length > 0) {
    return `We couldn't load your tasks: ${error.messages.join(" ")}`;
  }
  return "We couldn't load your tasks. Please try again.";
}

export type TaskAction = "update" | "delete";

export function taskActionErrorMessage(
  error: unknown,
  action: TaskAction,
): string {
  if (error instanceof ApiError && error.messages.length > 0) {
    return `We couldn't ${action} that task: ${error.messages.join(" ")}`;
  }
  return `We couldn't ${action} that task. Please try again.`;
}

export function applyCompleted(
  tasks: Task[],
  id: string,
  completed: boolean,
): Task[] {
  return tasks.map((task) => (task.id === id ? { ...task, completed } : task));
}

export interface TaskListProps {
  client?: ApiClient;
}

export function TaskList({ client = apiClient }: TaskListProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);

  const queryKey = tasksQueryKey(user?.id ?? null);

  const query = useQuery({
    queryKey,
    queryFn: () => client.listTasks({ limit: TASK_PAGE_LIMIT }),
    enabled: Boolean(user),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      client.updateTask(id, { completed }),
    onMutate: async ({ id, completed }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Paginated<Task>>(queryKey);
      if (previous) {
        queryClient.setQueryData<Paginated<Task>>(queryKey, {
          ...previous,
          data: applyCompleted(previous.data, id, completed),
        });
      }
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      setActionError(taskActionErrorMessage(error, "update"));
    },
    onSuccess: () => {
      setActionError(null);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) =>
      client.updateTask(id, input),
    onError: (error) => {
      setActionError(taskActionErrorMessage(error, "update"));
    },
    onSuccess: () => {
      setActionError(null);
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => client.deleteTask(id),
    onError: (error) => {
      setActionError(taskActionErrorMessage(error, "delete"));
    },
    onSuccess: () => {
      setActionError(null);
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const actions: TaskItemActions = {
    onToggle: async (task) => {
      await toggleMutation.mutateAsync({
        id: task.id,
        completed: !task.completed,
      });
    },
    onSave: async (id, input) => {
      await updateMutation.mutateAsync({ id, input });
    },
    onDelete: async (id) => {
      await deleteMutation.mutateAsync(id);
    },
  };

  let state: TaskListViewState;

  if (query.status === "error") {
    state = {
      status: "error",
      message: taskErrorMessage(query.error),
      onRetry: () => {
        void query.refetch();
      },
    };
  } else if (query.status === "success") {
    state = { status: "ready", tasks: query.data.data };
  } else {
    state = { status: "loading" };
  }

  return (
    <>
      {actionError ? (
        <p
          role="alert"
          className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {actionError}
        </p>
      ) : null}
      <TaskListView state={state} actions={actions} />
    </>
  );
}
