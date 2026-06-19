import { useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import type { ClipboardEntry } from "../types";

interface UseClipboardEventsOptions {
  onUpdated: (entry: ClipboardEntry) => void;
  onRemoved: (id: number) => void;
  onChanged?: () => void;
}

export const useClipboardEvents = ({ onUpdated, onRemoved, onChanged }: UseClipboardEventsOptions) => {
  const onUpdatedRef = useRef(onUpdated);
  const onRemovedRef = useRef(onRemoved);
  const onChangedRef = useRef(onChanged);
  const changedTimerRef = useRef<number | null>(null);

  useEffect(() => {
    onUpdatedRef.current = onUpdated;
  }, [onUpdated]);

  useEffect(() => {
    onRemovedRef.current = onRemoved;
  }, [onRemoved]);

  useEffect(() => {
    onChangedRef.current = onChanged;
  }, [onChanged]);

  useEffect(() => {
    const scheduleChanged = () => {
      if (changedTimerRef.current !== null) {
        window.clearTimeout(changedTimerRef.current);
      }
      changedTimerRef.current = window.setTimeout(() => {
        changedTimerRef.current = null;
        onChangedRef.current?.();
      }, 80);
    };

    const unlistenUpdate = listen<ClipboardEntry>("clipboard-updated", (event) => {
      onUpdatedRef.current(event.payload);
    });
    const unlistenRemove = listen<number>("clipboard-removed", (event) => {
      onRemovedRef.current(event.payload);
    });
    const unlistenChanged = listen("clipboard-changed", scheduleChanged);

    return () => {
      if (changedTimerRef.current !== null) {
        window.clearTimeout(changedTimerRef.current);
        changedTimerRef.current = null;
      }
      unlistenUpdate.then((f) => f());
      unlistenRemove.then((f) => f());
      unlistenChanged.then((f) => f());
    };
  }, []);
};

