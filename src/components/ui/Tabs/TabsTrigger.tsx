import { useContext, ReactNode } from 'react';
import { TabsContext } from './TabsContext';
import { cn } from '@/lib/utils';

interface TabsTriggerProps {
  children: ReactNode;
  value: string;
  disabled?: boolean;
  className?: string;
}

function TabsTrigger({
  children,
  value,
  disabled = false,
  className,
}: TabsTriggerProps) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('TabsTrigger must be used within Tabs');

  const isActive = ctx.value === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-disabled={disabled || undefined}
      data-state={isActive ? 'active' : 'inactive'}
      disabled={disabled}
      onClick={() => {
        if (!isActive && !disabled) {
          ctx.onValueChange?.(value);
        }
      }}
      className={cn(
        'tab-trigger',
        'relative flex items-center justify-center',
        'px-4 py-3 -mb-px',
        'text-sm font-medium',
        'transition-all duration-200 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        isActive
          ? 'text-blue-600 border-b-2 border-blue-600'
          : 'text-slate-600 hover:text-blue-600 hover:border-b-2 hover:border-blue-300',
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
    >
      {children}
    </button>
  );
}

export default TabsTrigger;
