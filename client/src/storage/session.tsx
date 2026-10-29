import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { PrincipalRole } from "./noteRepository";
import { sessionSource } from "./services";

export type SessionState = {
  principal: PrincipalRole;
  principalId: string;
  setPrincipal: (principal: PrincipalRole) => void;
};

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [principal, setPrincipalState] = useState<PrincipalRole>(sessionSource.principal);

  const setPrincipal = (next: PrincipalRole) => {
    sessionSource.principal = next;
    setPrincipalState(next);
  };

  const value = useMemo<SessionState>(
    () => ({
      principal,
      principalId: principal === "human" ? "human-owner" : "machine-agent",
      setPrincipal,
    }),
    [principal],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error("useSession must be used inside SessionProvider");
  }
  return value;
}
