import { useState, useCallback, useEffect } from "react";
import { UploadCloud, Image as ImageIcon, Type, Loader2, CheckCircle2, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { extractTextFromImage } from "@/lib/puter-ai";

interface UploadAreaProps {
  onTextExtracted: (text: string) => void;
  isLoading?: boolean;
}

async function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve({ base64, mimeType: file.type || "image/jpeg" });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function UploadArea({ onTextExtracted, isLoading }: UploadAreaProps) {
  const [activeTab, setActiveTab] = useState("image");
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionDone, setExtractionDone] = useState(false);
  const [manualText, setManualText] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const processImage = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;

    setPreviewImage(URL.createObjectURL(file));
    setIsExtracting(true);
    setExtractionDone(false);
    setStatus("Analyzing image with AI...");

    try {
      const { base64, mimeType } = await fileToBase64(file);
      const text = await extractTextFromImage(base64, mimeType);

      setStatus("Done!");
      setExtractionDone(true);

      setTimeout(() => {
        onTextExtracted(text);
        setIsExtracting(false);
        setStatus("");
        setExtractionDone(false);
      }, 800);
    } catch (error) {
      console.error("Extraction error:", error);
      const msg = error instanceof Error ? error.message : "Failed to extract text. Please try again or use Manual Text.";
      setStatus(msg);
      setTimeout(() => {
        setIsExtracting(false);
        setStatus("");
      }, 6000);
    }
  }, [onTextExtracted]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processImage(file);
  }, [processImage]);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (activeTab !== "image") return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) { processImage(file); break; }
        }
      }
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [activeTab, processImage]);

  const clearImage = () => {
    setPreviewImage(null);
    setIsExtracting(false);
    setStatus("");
  };

  return (
    <Card className="w-full bg-white dark:bg-card border-border shadow-sm">
      <CardContent className="p-4 sm:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="image" data-testid="tab-image">
              <ImageIcon className="w-4 h-4 mr-2" />
              Image Upload
            </TabsTrigger>
            <TabsTrigger value="text" data-testid="tab-text">
              <Type className="w-4 h-4 mr-2" />
              Manual Text
            </TabsTrigger>
          </TabsList>

          <TabsContent value="image" className="mt-0">
            {!previewImage ? (
              <div
                className={`relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg transition-colors cursor-pointer ${
                  isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-secondary/40"
                }`}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => document.getElementById("file-upload")?.click()}
                data-testid="upload-dropzone"
              >
                <input
                  id="file-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && processImage(e.target.files[0])}
                  data-testid="input-file"
                />
                <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
                <p className="mb-2 text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-muted-foreground">PNG, JPG or paste from clipboard (Ctrl+V)</p>
                <div className="flex items-center gap-1.5 mt-3 text-xs text-primary/70">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI-powered — works with printed text and handwriting</span>
                </div>
              </div>
            ) : (
              <div className="relative flex flex-col items-center w-full border rounded-lg overflow-hidden bg-black/5" data-testid="preview-container">
                <div className="relative w-full" style={{ minHeight: "160px", maxHeight: "300px" }}>
                  <img src={previewImage} alt="Uploaded question" className="object-contain w-full" style={{ maxHeight: "300px" }} />
                  {!isExtracting && (
                    <button
                      onClick={clearImage}
                      className="absolute top-2 right-2 px-3 py-1.5 bg-background/90 backdrop-blur-sm rounded-md shadow-sm hover:bg-background transition-colors text-sm font-medium border"
                      data-testid="button-clear-image"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {isExtracting && (
                  <div className="w-full px-6 py-5 border-t bg-card" data-testid="extracting-indicator">
                    <div className="flex items-center gap-2">
                      {extractionDone ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                      ) : (
                        <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                      )}
                      <span className="text-sm font-medium text-foreground">{status}</span>
                    </div>
                    {!extractionDone && (
                      <div className="mt-2 h-1 w-full rounded-full bg-secondary overflow-hidden">
                        <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: "60%" }} />
                      </div>
                    )}
                  </div>
                )}

                {status && !isExtracting && (
                  <div className="w-full px-6 py-3 border-t bg-red-50 dark:bg-red-900/20 text-sm text-red-600 dark:text-red-400">
                    {status}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="text" className="mt-0">
            <div className="flex flex-col space-y-4">
              <Textarea
                placeholder="Paste or type your question here. You can include math like: If sin(θ) = 3/5, find cos(θ)..."
                className="min-h-[200px] resize-y font-mono text-sm"
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                data-testid="input-manual-text"
              />
              <button
                className="self-end px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                onClick={() => onTextExtracted(manualText)}
                disabled={!manualText.trim() || isLoading}
                data-testid="button-submit-text"
              >
                Use this text
              </button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
