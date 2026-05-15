"use client";

import dynamic from "next/dynamic";

const FloatingButtons = dynamic(() => import("@/components/FloatingButtons"), { ssr: false });
const ChatWidget = dynamic(() => import("@/components/ChatWidget"), { ssr: false });

export default function ClientOnlyWidgets() {
  return (
    <>
      <FloatingButtons />
      <ChatWidget />
    </>
  );
}
