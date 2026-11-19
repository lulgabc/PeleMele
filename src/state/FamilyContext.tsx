import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react';
import type { AppState } from '../lib/types';
import { familyReducer, type FamilyAction } from '../lib/reducer';
import { saveState } from '../lib/storage';
import { applyTheme } from '../lib/themes';

interface FamilyContextValue {
  state: AppState;
  dispatch: (action: FamilyAction) => void;
}

const FamilyContext = createContext<FamilyContextValue | null>(null);

export function FamilyProvider({ initialState, children }: { initialState: AppState; children: ReactNode }) {
  const [state, dispatch] = useReducer(familyReducer, initialState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    applyTheme(state.skin, state.customTheme);
  }, [state.skin, state.customTheme]);

  return <FamilyContext.Provider value={{ state, dispatch }}>{children}</FamilyContext.Provider>;
}

export function useFamily(): FamilyContextValue {
  const value = useContext(FamilyContext);
  if (!value) throw new Error('useFamily must be used inside FamilyProvider');
  return value;
}
