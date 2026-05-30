import React from 'react';

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className="bg-white dark:bg-[#070617]">
      <main className="px-4 md:px-12 pb-16">{children}</main>
    </section>
  );
}
