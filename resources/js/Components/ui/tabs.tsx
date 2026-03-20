import * as React from 'react';

interface TabsProps {
  defaultValue: string;
  className?: string;
  children: React.ReactNode;
}

interface TabsContextValue {
  value: string;
  setValue: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined);

export function Tabs({ defaultValue, className, children }: TabsProps) {
  const [value, setValue] = React.useState(defaultValue);

  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children }: { children: React.ReactNode }) {
  return <div className="inline-flex items-center gap-2 border-b pb-2">{children}</div>;
}

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
}

export function TabsTrigger({ value, children }: TabsTriggerProps) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) return null;
  const isActive = ctx.value === value;

  return (
    <button
      type="button"
      onClick={() => ctx.setValue(value)}
      className={`border-b-2 px-3 py-1 text-sm ${
        isActive ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
      }`}
    >
      {children}
    </button>
  );
}

interface TabsContentProps {
  value: string;
  className?: string;
  children: React.ReactNode;
}

export function TabsContent({ value, className, children }: TabsContentProps) {
  const ctx = React.useContext(TabsContext);
  if (!ctx || ctx.value !== value) return null;

  return <div className={className}>{children}</div>;
}

