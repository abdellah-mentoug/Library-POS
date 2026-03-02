import { useEffect, useCallback, useRef } from "react";

interface UseBarcodeScanner {
  onScan: (barcode: string) => void;
  enabled?: boolean;
  minLength?: number;
  maxDelay?: number;
  terminatorKey?: string;
}

export function useBarcodeScanner({
  onScan,
  enabled = true,
  minLength = 4,
  maxDelay = 50,
  terminatorKey = "Enter",
}: UseBarcodeScanner) {
  const buffer = useRef<string>("");
  const lastKeyTime = useRef<number>(0);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const now = Date.now();
      const timeSinceLastKey = now - lastKeyTime.current;

      if (timeSinceLastKey > maxDelay && buffer.current.length > 0) {
        buffer.current = "";
      }

      lastKeyTime.current = now;

      if (event.key === terminatorKey) {
        if (buffer.current.length >= minLength) {
          event.preventDefault();
          event.stopPropagation();
          onScanRef.current(buffer.current);
        }
        buffer.current = "";
        return;
      }

      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        if (buffer.current.length === 0 || timeSinceLastKey <= maxDelay) {
          buffer.current += event.key;
        }
      }
    },
    [enabled, minLength, maxDelay, terminatorKey]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => {
      document.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [handleKeyDown, enabled]);
}
