import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useStore } from '../state/store';

export function RequireOnboarded({ children }: { children: ReactNode }) {
  const { state } = useStore();
  return state.onboarded ? children : <Navigate to="/welcome" replace />;
}
