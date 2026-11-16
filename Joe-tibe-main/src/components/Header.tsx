import React, { useState } from "react";

interface HeaderProps {
  onSearch?: (query: string) => void;
  theme?: "dark" | "light";
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onSearch, theme = "dark", onToggleTheme }) => {
  const [q, setQ] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim() && onSearch) onSearch(q.trim());
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0a0a0d]/85 backdrop-blur-xl border-b border-[#26262e]">
      <div className="mx-auto flex items-center gap-3 px-4 py-3">
        {/* Logo */}
        <a href="#top" className="flex items-center gap-2.5 shrink-0">
          <img
            src="/apple-touch-icon.png"
            alt="JoeTube"
            className="w-9 h-9 rounded-xl object-cover shadow-lg shadow-yellow-500/20"
          />
          <span className="text-xl font-black tracking-tight text-white flex items-center gap-2">
            JoeTube
            <span className="hidden sm:inline text-[10px] font-bold text-black bg-gold-grad px-2 py-0.5 rounded-md">
              2027
            </span>
          </span>
        </a>

        {/* Center search */}
        <form onSubmit={submit} className="flex-1 hidden md:block max-w-2xl mx-auto">
          <div className="relative flex items-center">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث عن فيديو أو انسخ الرابط..."
              className="w-full bg-[#101014] border border-[#26262e] focus:border-yellow-400/70 rounded-full py-2.5 pr-12 pl-4 text-sm text-white placeholder-zinc-500 outline-none transition-colors"
            />
            <button
              type="submit"
              className="absolute left-2 grid place-items-center w-8 h-8 rounded-full text-zinc-400 hover:text-black hover:bg-gold-grad transition-colors"
              title="بحث"
            >
              <i className="fa-solid fa-magnifying-glass text-sm"></i>
            </button>
            <i className="fa-solid fa-link absolute right-4 text-zinc-500 text-sm"></i>
          </div>
        </form>

        {/* Right cluster */}
        <div className="flex items-center gap-1.5 mr-auto md:mr-0 shrink-0">
          <button
            onClick={onToggleTheme}
            className="grid place-items-center w-9 h-9 rounded-lg text-yellow-400 bg-[#101014] border border-[#26262e] hover:brightness-125 transition-all"
            title={theme === "dark" ? "التبديل للوضع النهاري" : "التبديل للوضع الليلي"}
            aria-label="تبديل الوضع"
          >
            <i className={`fa-solid ${theme === "dark" ? "fa-moon" : "fa-sun"}`}></i>
          </button>
        </div>
      </div>
    </header>
  );
};
