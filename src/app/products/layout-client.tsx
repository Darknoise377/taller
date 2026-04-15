// src/app/products/layout-client.tsx
"use client";

import { motion } from "framer-motion";
import React from "react";

export default function ProductsLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <motion.div
      key="products-layout"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
    >
      {children}
    </motion.div>
  );
}
