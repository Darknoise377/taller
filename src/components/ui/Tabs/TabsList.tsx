import { useContext, ReactNode } from 'react';
import { TabsContext } from './TabsContext';
import { cn } from '@/lib/utils';

interface TabsListProps {
  children: ReactNode;
  className?: string;
}

function TabsList({ children, className }: TabsListProps) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('TabsList must be used within Tabs');

  const isVertical = ctx.orientation === 'vertical';

  return (
    <div
      className={cn(
        'tabs-list',
        isVertical ? 'tabs-list--vertical' : 'tabs-list--horizontal',
        className,
      )}
      role="tablist"
    >
      {children}
    </div>
  );
}

export default TabsList;
