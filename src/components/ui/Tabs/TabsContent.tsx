import { useContext, ReactNode } from 'react';
import { TabsContext } from './TabsContext';
import { cn } from '@/lib/utils';

interface TabsContentProps {
  children: ReactNode;
  value: string;
  className?: string;
  sticky?: boolean;
}

function TabsContent({
  children,
  value,
  className,
  sticky = false,
}: TabsContentProps) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('TabsContent must be used within Tabs');

  const isActive = ctx.value === value;

  return (
    <div
      role="tabpanel"
      aria-hidden={!isActive}
      data-state={isActive ? 'active' : 'inactive'}
      data-value={value}
      className={cn(
        'tab-content',
        'pt-0',
        'data-[state=inactive]:hidden',
        sticky && 'sticky top-[calc(4rem+1px)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

export default TabsContent;
