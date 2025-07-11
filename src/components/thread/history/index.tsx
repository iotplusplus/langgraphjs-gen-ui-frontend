import { Button } from "@/components/ui/button";
import { useThreads } from "@/providers/Thread";
import { Thread } from "@langchain/langgraph-sdk";
import { useEffect, useState } from "react";

import { getContentString } from "../utils";
import { useQueryState, parseAsBoolean } from "nuqs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { PanelRightOpen, PanelRightClose } from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Card } from "@/components/ui/card";
import ReactFlow, { MiniMap, Controls, Background } from 'reactflow';
import 'reactflow/dist/style.css';
import sampleMemories from './sample-memories.json' assert { type: 'json' };

function ThreadList({
  threads,
  onThreadClick,
}: {
  threads: Thread[];
  onThreadClick?: (threadId: string) => void;
}) {
  const [threadId, setThreadId] = useQueryState("threadId");

  return (
    <div className="flex h-full w-full flex-col items-start justify-start gap-2 overflow-y-scroll [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-track]:bg-transparent">
      {threads.map((t) => {
        let itemText = t.thread_id;
        if (
          typeof t.values === "object" &&
          t.values &&
          "messages" in t.values &&
          Array.isArray(t.values.messages) &&
          t.values.messages?.length > 0
        ) {
          const firstMessage = t.values.messages[0];
          itemText = getContentString(firstMessage.content);
        }
        return (
          <div
            key={t.thread_id}
            className="w-full px-1"
          >
            <Button
              variant="ghost"
              className="w-[280px] items-start justify-start text-left font-normal"
              onClick={(e) => {
                e.preventDefault();
                onThreadClick?.(t.thread_id);
                if (t.thread_id === threadId) return;
                setThreadId(t.thread_id);
              }}
            >
              <p className="truncate text-ellipsis">{itemText}</p>
            </Button>
          </div>
        );
      })}
    </div>
  );
}

function ThreadHistoryLoading() {
  return (
    <div className="flex h-full w-full flex-col items-start justify-start gap-2 overflow-y-scroll [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-track]:bg-transparent">
      {Array.from({ length: 30 }).map((_, i) => (
        <Skeleton
          key={`skeleton-${i}`}
          className="h-10 w-[280px]"
        />
      ))}
    </div>
  );
}

export default function ThreadHistory() {
  const isLargeScreen = useMediaQuery("(min-width: 1024px)");
  const [chatHistoryOpen, setChatHistoryOpen] = useQueryState(
    "chatHistoryOpen",
    parseAsBoolean.withDefault(false),
  );

  // Memory UI state
  const [memoryDropdownOpen, setMemoryDropdownOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [graphOpen, setGraphOpen] = useState(false);
  const [memories, setMemories] = useState(() => [...sampleMemories]);

  // Manage Memories logic
  const [newMemory, setNewMemory] = useState("");
  const addMemory = () => {
    if (newMemory.trim()) {
      setMemories((prev) => [...prev, { id: Date.now().toString(), text: newMemory.trim() }]);
      setNewMemory("");
    }
  };
  const removeMemory = (id: string) => setMemories((prev) => prev.filter((m) => m.id !== id));
  const clearMemories = () => setMemories([]);

  // Sample React Flow graph data
  const nodes = memories.map((m, i) => ({ id: m.id, data: { label: m.text }, position: { x: 100 + i * 120, y: 100 } }));
  const edges = memories.slice(1).map((m, i) => ({ id: `e${memories[i].id}-${m.id}`, source: memories[i].id, target: m.id }));

  const { getThreads, threads, setThreads, threadsLoading, setThreadsLoading } =
    useThreads();

  useEffect(() => {
    if (typeof window === "undefined") return;
    setThreadsLoading(true);
    getThreads()
      .then(setThreads)
      .catch(console.error)
      .finally(() => setThreadsLoading(false));
  }, []);

  return (
    <>
      <div className="shadow-inner-right hidden h-screen w-[300px] shrink-0 flex-col items-start justify-start gap-6 border-r-[1px] border-slate-300 lg:flex">
        {/* Memory Dropdown Button */}
        <div className="w-full px-4 pt-4 relative">
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={() => setMemoryDropdownOpen((o) => !o)}
          >
            <span>Memory</span>
            <span>▼</span>
          </Button>
          {memoryDropdownOpen && (
            <Card className="absolute left-0 right-0 z-30 mt-2 p-2 flex flex-col gap-2">
              <Button variant="ghost" onClick={() => { setManageOpen(true); setMemoryDropdownOpen(false); }}>Manage Memories</Button>
              <Button variant="ghost" onClick={() => { setGraphOpen(true); setMemoryDropdownOpen(false); }}>Show Memory Graph</Button>
            </Card>
          )}
        </div>
        {/* Manage Memories Modal */}
        <Sheet open={manageOpen} onOpenChange={setManageOpen}>
          <SheetContent side="left" className="w-[350px]">
            <SheetHeader>
              <SheetTitle>Manage Memories</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-2 mt-4">
              <ul className="max-h-40 overflow-y-auto text-sm">
                {memories.length === 0 && <li className="text-gray-400">No memories yet.</li>}
                {memories.map((mem) => (
                  <li key={mem.id} className="flex items-center justify-between gap-2 py-1 border-b last:border-b-0">
                    <span className="truncate flex-1" title={mem.text}>{mem.text}</span>
                    <Button size="sm" variant="ghost" onClick={() => removeMemory(mem.id)} title="Delete">✕</Button>
                  </li>
                ))}
              </ul>
              {memories.length > 0 && (
                <Button variant="destructive" size="sm" onClick={clearMemories}>Delete All</Button>
              )}
            </div>
          </SheetContent>
        </Sheet>
        {/* Memory Graph Modal */}
        <Sheet open={graphOpen} onOpenChange={setGraphOpen}>
          <SheetContent side="left" className="w-[500px]">
            <SheetHeader>
              <SheetTitle>Memory Graph</SheetTitle>
            </SheetHeader>
            <div className="h-[400px] w-full mt-4 bg-white rounded shadow">
              <ReactFlow nodes={nodes} edges={edges} fitView>
                <MiniMap />
                <Controls />
                <Background />
              </ReactFlow>
            </div>
          </SheetContent>
        </Sheet>
        {/* Thread History Section */}
        <div className="flex w-full items-center justify-between px-4 pt-1.5">
          <Button
            className="hover:bg-gray-100"
            variant="ghost"
            onClick={() => setChatHistoryOpen((p) => !p)}
          >
            {chatHistoryOpen ? (
              <PanelRightOpen className="size-5" />
            ) : (
              <PanelRightClose className="size-5" />
            )}
          </Button>
          <h1 className="text-xl font-semibold tracking-tight">
            Thread History
          </h1>
        </div>
        {threadsLoading ? (
          <ThreadHistoryLoading />
        ) : (
          <ThreadList threads={threads} />
        )}
      </div>
      <div className="lg:hidden">
        <Sheet
          open={!!chatHistoryOpen && !isLargeScreen}
          onOpenChange={(open) => {
            if (isLargeScreen) return;
            setChatHistoryOpen(open);
          }}
        >
          <SheetContent
            side="left"
            className="flex lg:hidden"
          >
            <SheetHeader>
              <SheetTitle>Thread History</SheetTitle>
            </SheetHeader>
            <ThreadList
              threads={threads}
              onThreadClick={() => setChatHistoryOpen((o) => !o)}
            />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
