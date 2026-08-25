import { ReactNode } from 'react';

export interface TabValue {
  id: string;
  label: ReactNode;
  disabled?: boolean;
}

export interface TabsContextValue {
  value: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  orientation: 'horizontal' | 'vertical';
}
