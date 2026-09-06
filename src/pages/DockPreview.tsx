import { useState } from "react";
import { BottomDock } from "@/components/BottomDock";

export default function DockPreviewPage() {
  return (
    <div className="fixed inset-0 z-[9999] flex h-full w-full flex-col bg-[#0A0A0C]">
      <div className="absolute inset-0 overflow-y-auto">
        <div className="min-h-full space-y-6 p-6 pt-8">
          <h1 className="text-2xl font-bold text-white">Dock Mobile Preview</h1>
          <p className="text-sm text-neutral-400">
            Mobile layout — sidebar ocultado, BottomDock visível.
          </p>
        </div>
      </div>
      <BottomDock onCentralPress={() => console.log("AI pressed")} />
    </div>
  );
}
