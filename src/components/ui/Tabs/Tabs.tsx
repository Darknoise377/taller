import { useState, ReactNode } from 'react';
import { TabsContext } from './TabsContext';
import type { TabValue } from './types';

interface TabsProps {
  children: ReactNode;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

function Tabs({
  children,
  defaultValue,
  value,
  onValueChange,
  orientation = 'horizontal',
  className,
}: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? '');

  const isControlled = value !== undefined;
  const currentValue = isControlled ? value! : internalValue;

  const handleValueChange = (newValue: string) => {
    if (!isControlled) setInternalValue(newValue);
    onValueChange?.(newValue);
  };

  return (
    <TabsContext.Provider
      value={{
        value: currentValue,
        defaultValue,
        onValueChange: handleValueChange,
        orientation,
      }}
    >
      <div
        className={className}
        role="tablist"
        aria-orientation={orientation}
        data-orientation={orientation}
      >
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export default Tabs;
export type { TabValue };
