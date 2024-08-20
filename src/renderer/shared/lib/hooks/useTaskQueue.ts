import { useCallback, useEffect, useState } from 'react';

export type Task = () => Promise<void> | void;
type TaskQueue = {
  tasks: readonly Task[];
  addTask: (task: Task) => void;
};

export function useTaskQueue(): TaskQueue {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (tasks.length === 0) return;
    if (isProcessing) return;

    const task = tasks[0];
    setTasks((prev) => prev.slice(1));
    setIsProcessing(true);

    Promise.resolve(task()).finally(() => {
      setIsProcessing(false);
    });
  }, [isProcessing, tasks.length]);

  const addTask = useCallback((task: Task) => {
    setTasks((prev) => [...prev, task]);
  }, []);

  return {
    tasks,
    addTask,
  };
}
