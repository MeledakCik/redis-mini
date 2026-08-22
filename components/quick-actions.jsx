"use client";
import { Plus, Brain, BookOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// REVAMP: 3 shortcut besar di Overview biar user langsung tahu "harus ngapain dulu".
export function QuickActions({ onCreateDatabase }) {
  return (
    <Card>
      <div className="p-4 md:p-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Button onClick={onCreateDatabase} className="justify-start h-11 w-full">
          <Plus size={16} /> Create Database
        </Button>
        <Button variant="subtle" className="justify-start h-11 w-full" onClick={() => (window.location.href = "/vector")}>
          <Brain size={16} /> Create Vector Index
        </Button>
        <a href="https://docs.kasyaf.id" target="_blank" rel="noopener noreferrer" className="block">
          <Button variant="outline" className="justify-start h-11 w-full">
            <BookOpen size={16} /> View Docs
          </Button>
        </a>
      </div>
    </Card>
  );
}
