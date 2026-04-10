"use client";

import { useState, useRef } from "react";
import { Upload, FileText, Languages, ChevronLeft, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TTSPlayer } from "@/components/features/translator/tts-player";
import { toast } from "sonner";

const LANGUAGES = [
  { code: "hi-IN", name: "हिंदी (Hindi)" },
  { code: "mr-IN", name: "मराठी (Marathi)" },
  { code: "gu-IN", name: "ગુજરાતી (Gujarati)" },
  { code: "ta-IN", name: "தமிழ் (Tamil)" },
  { code: "te-IN", name: "తెలుగు (Telugu)" },
  { code: "kn-IN", name: "ಕನ್ನಡ (Kannada)" },
  { code: "bn-IN", name: "বাংলা (Bengali)" },
  { code: "pa-IN", name: "ਪੰਜਾਬੀ (Punjabi)" },
];

export default function TranslatorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [language, setLanguage] = useState<string>("hi-IN");
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setTranslatedText(null);
      
      if (selectedFile.type.startsWith("image/")) {
        const url = URL.createObjectURL(selectedFile);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleTranslate = async () => {
    if (!file) {
      toast.error("Please select a document or image first.");
      return;
    }

    try {
      setIsTranslating(true);
      
      const formData = new FormData();
      formData.append("file", file);
      formData.append("language", language);

      const response = await fetch("/api/translate-document", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Translation failed");
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setTranslatedText(data.text);
      toast.success("Document translated successfully!");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to translate document.");
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-svh max-w-xl flex-col gap-6 p-4 md:p-6 bg-slate-50 dark:bg-slate-950 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
        <Button variant="ghost" size="icon" asChild className="rounded-full shadow-sm bg-white dark:bg-slate-900">
          <Link href="/dashboard">
            <ChevronLeft className="w-6 h-6" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Document Translator</h1>
          <p className="text-sm text-slate-500 font-medium">Read papers in your language</p>
        </div>
      </div>

      {/* Language Selector */}
      <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
        <CardContent className="p-5 flex items-center gap-4 bg-white dark:bg-slate-900">
          <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
            <Languages className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Translate to</label>
            <select 
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full bg-transparent text-lg font-bold text-slate-900 dark:text-white outline-none cursor-pointer"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code} className="text-base text-black">{lang.name}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Upload Section */}
      <Card 
        className={`border-2 border-dashed shadow-none rounded-3xl overflow-hidden transition-colors cursor-pointer ${file ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20' : 'border-slate-200 hover:border-slate-300 bg-white dark:bg-slate-900 dark:border-slate-800'}`}
        onClick={() => fileInputRef.current?.click()}
      >
        <CardContent className="p-8 flex flex-col items-center justify-center text-center gap-4 min-h-[200px]">
          <input 
            type="file" 
            ref={fileInputRef}
            className="hidden" 
            accept="image/*,application/pdf"
            onChange={handleFileChange}
          />
          
          {previewUrl ? (
            <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
              <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
            </div>
          ) : file ? (
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mb-2">
              <FileText className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-2">
              <Upload className="w-10 h-10 text-slate-400" />
            </div>
          )}

          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {file ? file.name : "Tap to upload paper"}
            </h3>
            <p className="text-slate-500 font-medium mt-1">
              {file ? "Tap again to change" : "Photos or PDFs supported"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Action Button */}
      {file && !translatedText && (
        <Button 
          onClick={handleTranslate} 
          disabled={isTranslating}
          size="lg"
          className="w-full h-16 rounded-2xl text-lg font-bold shadow-md bg-blue-600 hover:bg-blue-700 text-white tracking-wide"
        >
          {isTranslating ? "Reading Document..." : "Translate Document"}
        </Button>
      )}

      {/* Result Section */}
      {translatedText && (
        <div className="flex flex-col gap-4 animate-in slide-in-from-bottom-4 fade-in duration-500">
          <div className="flex items-center gap-3 py-2">
            <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800"></div>
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Result</span>
            <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800"></div>
          </div>

          <TTSPlayer text={translatedText} language={language} />

          <Card className="border-none shadow-sm rounded-3xl bg-white dark:bg-slate-900">
            <CardContent className="p-6">
              <div className="prose dark:prose-invert prose-p:leading-relaxed prose-slate max-w-none">
                {translatedText.split('\\n').map((paragraph, i) => (
                  <p key={i} className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-4 last:mb-0">
                    {paragraph}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Button 
            variant="outline" 
            size="lg"
            onClick={() => {
              setFile(null);
              setPreviewUrl(null);
              setTranslatedText(null);
            }}
            className="w-full h-14 rounded-2xl font-bold border-2"
          >
            Translate Another Document
          </Button>
        </div>
      )}
    </div>
  );
}
