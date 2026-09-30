"use client";

import React from "react";
import { Header } from "./Header";
import { ConversationPanel } from "../conversation/ConversationPanel";
import { UserPanel } from "../user/UserPanel";
import { DeveloperPanel } from "../developer/DeveloperPanel";
import { useRAGSessionStore } from "@/stores/ragSessionStore";

export const AppShell: React.FC = () => {
  const developerMode = useRAGSessionStore((state) => state.developerMode);
  const activeMobileTab = useRAGSessionStore((state) => state.activeMobileTab);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Global Header */}
      <Header />

      {/* Main Responsive Grid Layout */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto p-3 sm:p-4 md:p-6 overflow-hidden">
        {/* Desktop View (1024px and above) */}
        <div className="hidden lg:grid grid-cols-12 gap-6 h-[calc(100vh-110px)]">
          {/* Left Column: Conversation & Input (7 Columns ~58-65%) */}
          <div className="col-span-7 xl:col-span-7 flex flex-col h-full overflow-hidden bg-slate-950">
            <ConversationPanel />
          </div>

          {/* Right Column: Dynamic Panel based on User View vs Developer View */}
          <div className="col-span-5 xl:col-span-5 flex flex-col h-full bg-slate-950 border-l border-slate-800/80 pl-6 overflow-y-auto space-y-4">
            {/* Panel Content: Switches dynamically based on Developer Mode toggle */}
            <div className="flex-1 overflow-y-auto pr-1 pt-1">
              {developerMode ? <DeveloperPanel /> : <UserPanel />}
            </div>
          </div>
        </div>

        {/* Mobile & Tablet View (below 1024px) */}
        <div className="block lg:hidden h-[calc(100vh-140px)]">
          {activeMobileTab === "chat" && (
            <div className="h-full">
              <ConversationPanel />
            </div>
          )}

          {activeMobileTab === "pipeline" && (
            <div className="h-full overflow-y-auto">
              <UserPanel />
            </div>
          )}

          {activeMobileTab === "telemetry" && (
            <div className="h-full overflow-y-auto">
              <DeveloperPanel />
            </div>
          )}

          {activeMobileTab === "developer" && (
            <div className="h-full overflow-y-auto">
              <DeveloperPanel />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
