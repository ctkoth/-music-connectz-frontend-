import { createContext, useContext, useState, useCallback } from "react";

const TransactionModalContext = createContext(null);

export function TransactionModalProvider({ children }) {
  const [resource, setResource] = useState(null);
  const openTransactions = useCallback((r) => setResource(r || null), []);
  const closeTransactions = useCallback(() => setResource(null), []);
  return (
    <TransactionModalContext.Provider value={{ resource, openTransactions, closeTransactions }}>
      {children}
    </TransactionModalContext.Provider>
  );
}

export function useTransactionModal() {
  return useContext(TransactionModalContext) || { resource: null, openTransactions: () => {}, closeTransactions: () => {} };
}
