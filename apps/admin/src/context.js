import { createContext, useContext } from 'react';

// { user, lookups, reloadLookups, go(page) }
export const AdminContext = createContext(null);

export const useAdmin = () => useContext(AdminContext);
