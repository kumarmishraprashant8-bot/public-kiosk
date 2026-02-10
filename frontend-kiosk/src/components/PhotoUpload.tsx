import { useState, useRef } from "react";
import { OCRParseResponse } from "../types";
import api from "../utils/api";

interface PhotoUploadProps {
  onOCRComplete: (data: OCRParseResponse) => void;
  onUploadComplete?: (url: string) => void;
  onFileSelect?: (file: File) => void;
  lang: string;
}

export default function PhotoUpload({ onOCRComplete, onUploadComplete, onFileSelect, lang: _lang }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    if (onFileSelect) onFileSelect(file);

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      // Parallel Upload & OCR
      const [ocrRes, uploadRes] = await Promise.allSettled([
        api.post<OCRParseResponse>("/ocr/parse", formData, { headers: { "Content-Type": "multipart/form-data" } }),
        api.post<{ url: string }>("/files/upload", formData, { headers: { "Content-Type": "multipart/form-data" } })
      ]);

      if (ocrRes.status === 'fulfilled') {
        onOCRComplete(ocrRes.value.data);
      } else {
        console.error("OCR Failed", ocrRes.reason);
      }

      if (uploadRes.status === 'fulfilled' && onUploadComplete) {
        onUploadComplete(uploadRes.value.data.url);
      }

    } catch (error) {
      console.error("Processing error:", error);
      alert("Failed to process image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mb-6">
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
        id="photo-upload"
      />
      <label
        htmlFor="photo-upload"
        className="block w-full p-8 border-4 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors text-center"
        style={{ minHeight: "200px" }}
      >
        {preview ? (
          <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded" />
        ) : (
          <div className="flex flex-col items-center justify-center h-full">
            <span className="text-6xl mb-4">📷</span>
            <span className="text-xl">
              {uploading ? "Processing..." : "Click to Upload Photo"}
            </span>
          </div>
        )}
      </label>
    </div>
  );
}
