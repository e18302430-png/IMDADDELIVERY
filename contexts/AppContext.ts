
import { createContext, Dispatch, SetStateAction } from 'react';
import type { AppData, CurrentUser } from '../types';

interface AppContextType {
    currentUser: CurrentUser | null;
    setCurrentUser: Dispatch<SetStateAction<CurrentUser | null>>;
    data: AppData;
    setData: Dispatch<SetStateAction<AppData>>;
}

export const AppContext = createContext<AppContextType>(null!);

export const AppProvider = AppContext.Provider;
