import React from "react";

interface NavItem {
  id: string;
  label: string;
  icon: string;
}

const NAV: NavItem[] = [
  { id: "home", label: "الرئيسية", icon: "fa-solid fa-house" },
  { id: "downloads", label: "التنزيلات", icon: "fa-solid fa-download" },
  { id: "playlists", label: "قوائم التشغيل", icon: "fa-solid fa-list-ul" },
  { id: "favorites", label: "المفضلة", icon: "fa-regular fa-heart" },
  { id: "history", label: "تاريخ المشاهدة", icon: "fa-regular fa-clock" }
];

const SOURCES = [
  { name: "YouTube", icon: "fa-brands fa-youtube", color: "text-red-500" },
  { name: "TikTok", icon: "fa-brands fa-tiktok", color: "text-white" },
  { name: "Facebook", icon: "fa-brands fa-facebook", color: "text-blue-500" },
  { name: "Instagram", icon: "fa-brands fa-instagram", color: "text-pink-500" }
];

interface SidebarProps {
  active: string;
  onSelect: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ active, onSelect }) => {
  return (
    <aside className="hidden lg:flex flex-col w-60 shrink-0 gap-1">
      <nav className="flex flex-col gap-1">
        {NAV.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                isActive
                  ? "bg-gold-grad text-black shadow-lg shadow-yellow-500/20"
                  : "text-zinc-400 hover:text-white hover:bg-[#141419]"
              }`}
            >
              <i className={`${item.icon} text-base w-5 text-center`}></i>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-6 px-4">
        <p className="text-[11px] font-bold text-zinc-500 mb-3">المصادر المدعومة</p>
        <div className="flex items-center gap-3">
          {SOURCES.map((s) => (
            <span
              key={s.name}
              title={s.name}
              className="grid place-items-center w-9 h-9 rounded-xl bg-[#101014] border border-[#26262e]"
            >
              <i className={`${s.icon} ${s.color} text-lg`}></i>
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
};
