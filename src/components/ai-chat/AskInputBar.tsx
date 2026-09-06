import { useState, type FormEvent, useRef } from "react";
import { Mic, Paperclip, X } from "lucide-react";
import "./ai-orb.css";

interface AskInputBarProps {
  placeholder?: string;
  onSubmit?: (value: string, file?: File) => void;
  onMicPress?: () => void;
  onAttach?: (file: File) => void;
}

export default function AskInputBar({
  placeholder = "Digite sua pergunta...",
  onSubmit,
  onMicPress,
  onAttach,
}: AskInputBarProps) {
  const [value, setValue] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim() && !selectedFile) return;
    onSubmit?.(value.trim(), selectedFile ?? undefined);
    setValue("");
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      onAttach?.(file);
    }
  };

  return (
    <div className="relative mx-auto w-full max-w-md">
      {/* Borda animada */}
      {!selectedFile && (
        <div
          aria-hidden
          className="absolute -inset-1 rounded-full animate-border-spin"
          style={{
            willChange: 'transform',
            background:
              "conic-gradient(from 0deg, rgba(255,255,255,0.95), rgba(168,100,255,0.6), rgba(255,255,255,0.95), rgba(168,100,255,0.6), rgba(255,255,255,0.95))",
          }}
        />
      )}

      <form onSubmit={handleSubmit} className="relative rounded-full">
        {/* Preview do anexo */}
        {selectedFile && (
          <div className="relative z-10 mb-2 flex items-center gap-2 rounded-full px-3 py-2 text-sm text-white/90">
            <Paperclip size={14} className="shrink-0" />
            <span className="flex-1 truncate">{selectedFile.name}</span>
            <button
              type="button"
              onClick={handleRemoveFile}
              aria-label="Remover anexo"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* Corpo do input */}
        <div
          className="relative z-10 flex items-center gap-2 rounded-full px-4 py-3.5 backdrop-blur-2xl ring-1 ring-white/15"
          style={{
            background:
              "linear-gradient(to bottom, rgba(26,5,51,0.55), rgba(59,7,100,0.55))",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.15), 0 8px 24px rgba(59,7,100,0.35)",
          }}
        >
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Anexar arquivo"
            className="flex shrink-0 items-center justify-center rounded-full p-1 transition-transform active:scale-90 text-white/85 hover:text-white"
          >
            <Paperclip size={20} strokeWidth={1.8} />
          </button>

          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-[15px] font-medium text-white placeholder-white/60 outline-none"
          />

          <button
            type="button"
            onClick={onMicPress}
            aria-label="Falar com o assistente"
            className="flex shrink-0 items-center justify-center rounded-full p-1 transition-transform active:scale-90"
          >
            <Mic size={20} strokeWidth={1.8} className="text-white/85" />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </form>
    </div>
  );
}
