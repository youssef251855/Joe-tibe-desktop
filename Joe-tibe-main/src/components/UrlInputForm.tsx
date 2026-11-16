import React, { useState } from "react";

interface UrlInputFormProps {
  url: string;
  setUrl: (url: string) => void;
  onSubmit: (input: string) => void;
  isLoading: boolean;
}

export const UrlInputForm: React.FC<UrlInputFormProps> = ({ url, setUrl, onSubmit, isLoading }) => {
  const [pasteSuccess, setPasteSuccess] = useState(false);

  const handlePaste = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          setUrl(text.trim());
          setPasteSuccess(true);
          setTimeout(() => setPasteSuccess(false), 2000);
          onSubmit(text.trim());
        }
      }
    } catch {
      // ignore clipboard error
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onSubmit(url.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative flex items-center gap-2 bg-white rounded-2xl p-1.5 shadow-2xl shadow-black/40 ring-2 ring-yellow-400/60">
        <i className="fa-solid fa-link text-zinc-400 text-lg px-2 shrink-0"></i>

        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="الصق رابط الفيديو هنا (يوتيوب، تيك توك، فيسبوك ريلز، إنستغرام)..."
          className="w-full bg-transparent text-zinc-900 placeholder-zinc-400 text-sm md:text-base outline-none py-2.5 px-1 font-semibold"
          disabled={isLoading}
        />

        {url && (
          <button
            type="button"
            onClick={() => setUrl("")}
            className="p-2 text-zinc-400 hover:text-zinc-700 transition-colors rounded-lg shrink-0"
            title="مسح"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        )}

        <button
          type="button"
          onClick={handlePaste}
          className={`hidden sm:grid place-items-center w-10 h-10 rounded-xl shrink-0 transition-colors ${
            pasteSuccess
              ? "bg-emerald-500 text-white"
              : "bg-zinc-100 hover:bg-zinc-200 text-zinc-600"
          }`}
          title="لصق من الحافظة"
        >
          <i className={`fa-solid ${pasteSuccess ? "fa-check" : "fa-paste"}`}></i>
        </button>

        <button
          type="submit"
          disabled={isLoading || !url.trim()}
          className="flex items-center gap-2 bg-gold-grad hover:brightness-105 text-black font-black px-5 py-2.5 rounded-xl shadow-lg shadow-yellow-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base shrink-0 pulse-glow"
        >
          {isLoading ? (
            <>
              <i className="fa-solid fa-circle-notch fa-spin text-sm"></i>
              <span className="hidden sm:inline">جاري الفحص...</span>
            </>
          ) : (
            <>
              <i className="fa-solid fa-download text-sm"></i>
              <span>تحميل الآن</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};
