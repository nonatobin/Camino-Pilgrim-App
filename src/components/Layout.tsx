import React from "react";
// No Firebase auth — using local storage
import { LogOut, User, Map as MapIcon, Activity, Users, Languages } from "lucide-react";
import { cn } from "../lib/utils";
import { featureFlags } from "../config/environment";
interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: any;
}
export default function Layout({
  children,
  activeTab,
  setActiveTab,
  user,
}: LayoutProps) {
  const allTabs = [
    { id: "plan", label: "Training Plan", icon: MapIcon, enabled: true },
    { id: "track", label: "Start Walk", icon: Activity, enabled: true },
    { id: "family", label: "Family Sync", icon: Users, enabled: featureFlags.familySyncEnabled },
    { id: "translate", label: "Translate", icon: Languages, enabled: featureFlags.translateEnabled },
  ];
  const tabs = allTabs.filter(t => t.enabled);
  return (
    <div className="min-h-screen bg-[#f5f5f0] font-serif text-[#1a1a1a]">
      {" "}
      {/* Header */}{" "}
      <header className="bg-white border-b border-[#5A5A40]/10 sticky top-0 z-50">
        {" "}
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          {" "}
          <div className="flex items-center gap-3">
            {" "}
            <div className="w-10 h-10 bg-[#5A5A40] rounded-full flex items-center justify-center text-white">
              {" "}
              <MapIcon size={20} />{" "}
            </div>{" "}
            <h1 className="text-2xl font-bold tracking-tight text-[#5A5A40]">
              Camino Pilgrim
            </h1>{" "}
          </div>{" "}
          <div className="flex items-center gap-4">
            {" "}
            <div className="hidden sm:flex flex-col items-end">
              {" "}
              <span className="text-sm font-medium">
                {user.displayName}
              </span>{" "}
              <button
                onClick={() => { localStorage.clear(); window.location.reload(); }}
                className="text-xs text-[#5A5A40] hover:underline flex items-center gap-1"
              >
                {" "}
                <LogOut size={12} /> Reset Profile{" "}
              </button>{" "}
            </div>{" "}
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName}
                className="w-10 h-10 rounded-full border-2 border-[#5A5A40]/20"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                {" "}
                <User size={20} />{" "}
              </div>
            )}{" "}
          </div>{" "}
        </div>{" "}
      </header>{" "}
      {/* Main Content */}{" "}
      <main className="max-w-4xl mx-auto px-6 py-8 pb-32"> {children} </main>{" "}
      {/* Bottom Navigation */}{" "}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#5A5A40]/10 px-6 py-3 sm:py-4 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {" "}
        <div className="max-w-4xl mx-auto flex justify-around items-center">
          {" "}
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex flex-col items-center gap-1 transition-all duration-300",
                activeTab === tab.id
                  ? "text-[#5A5A40] scale-110"
                  : "text-gray-400 hover:text-[#5A5A40]/70",
              )}
            >
              {" "}
              <tab.icon
                size={24}
                strokeWidth={activeTab === tab.id ? 2.5 : 2}
              />{" "}
              <span
                className={cn(
                  "text-[10px] uppercase tracking-widest font-bold",
                  activeTab === tab.id ? "opacity-100" : "opacity-60",
                )}
              >
                {" "}
                {tab.label}{" "}
              </span>{" "}
              {activeTab === tab.id && (
                <div className="w-1 h-1 bg-[#5A5A40] rounded-full mt-1" />
              )}{" "}
            </button>
          ))}{" "}
        </div>{" "}
      </nav>{" "}
    </div>
  );
}
