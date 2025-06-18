import { useEffect, useState } from "react";
import type { DatabaseService } from "@/services/database/database";

/**
 * Custom hook to safely access the database service on the client side only
 * @returns Database service instance or null if on server side
 */
export function useDatabase(): DatabaseService | null {
  const [dbService, setDbService] = useState<DatabaseService | null>(null);

  useEffect(() => {
    // Only run on client side
    if (typeof window !== "undefined") {
      import("@/services/database/database").then(({ getDbService }) => {
        setDbService(getDbService());
      });
    }
  }, []);

  return dbService;
}
