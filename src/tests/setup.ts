import "fake-indexeddb/auto";
import { vi } from "vitest";

// Mocking crypto.randomUUID if not available in the test environment
if (typeof crypto === "undefined" || !crypto.randomUUID) {
  vi.stubGlobal("crypto", {
    randomUUID: () =>
      "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0,
          v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }),
  });
}

// You can add any other global test setup here
