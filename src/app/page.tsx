import type { Metadata } from "next";

import { Board } from "@/components/board";

export const metadata: Metadata = {
  title: "Kanban — Tasks com Agentes",
};

export default function Home() {
  return (
    <main>
      <Board />
    </main>
  );
}
