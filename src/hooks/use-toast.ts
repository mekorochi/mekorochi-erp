"use client";

import * as React from "react";

const TOAST_LIMIT = 5;
const TOAST_REMOVE_DELAY = 5000;

export type ToastVariant = "default" | "success" | "error" | "warning" | "info";

type ToastAction = {
  label: string;
  onClick: () => void;
};

export type Toast = {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  action?: ToastAction;
  duration?: number;
};

type Action =
  | { type: "ADD_TOAST"; toast: Toast }
  | { type: "UPDATE_TOAST"; toast: Partial<Toast> & { id: string } }
  | { type: "DISMISS_TOAST"; toastId: string }
  | { type: "REMOVE_TOAST"; toastId: string };

interface State {
  toasts: Toast[];
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

function addToRemoveQueue(toastId: string, dispatch: React.Dispatch<Action>, duration?: number) {
  if (toastTimeouts.has(toastId)) return;
  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({ type: "REMOVE_TOAST", toastId });
  }, duration || TOAST_REMOVE_DELAY);
  toastTimeouts.set(toastId, timeout);
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ADD_TOAST":
      return { ...state, toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT) };
    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) => (t.id === action.toast.id ? { ...t, ...action.toast } : t)),
      };
    case "DISMISS_TOAST":
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.toastId) };
    case "REMOVE_TOAST":
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.toastId) };
    default:
      return state;
  }
}

let count = 0;
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

// Global dispatch for imperative usage
type Listener = (state: State) => void;
const listeners: Listener[] = [];
let memoryState: State = { toasts: [] };
let memoryDispatch: React.Dispatch<Action> = (action: Action) => {
  memoryState = reducer(memoryState, action);
  listeners.forEach((l) => l(memoryState));
};

export function toast(props: Omit<Toast, "id">) {
  const id = genId();
  memoryDispatch({ type: "ADD_TOAST", toast: { ...props, id } });
  addToRemoveQueue(id, memoryDispatch, props.duration);
  return id;
}

toast.success = (title: string, description?: string) =>
  toast({ title, description, variant: "success" });
toast.error = (title: string, description?: string) =>
  toast({ title, description, variant: "error" });
toast.warning = (title: string, description?: string) =>
  toast({ title, description, variant: "warning" });
toast.info = (title: string, description?: string) =>
  toast({ title, description, variant: "info" });

export function useToast() {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const idx = listeners.indexOf(setState);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, []);

  return {
    ...state,
    toast,
    dismiss: (toastId: string) => memoryDispatch({ type: "DISMISS_TOAST", toastId }),
  };
}
