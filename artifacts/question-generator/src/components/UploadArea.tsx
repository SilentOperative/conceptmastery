import { useState, useCallback, useEffect, useRef } from "react";
import { createWorker } from "tesseract.js";
import { UploadCloud, Image as ImageIcon, Type, Loader2, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";

interface UploadAreaProps {
  onTextExtracted: (text: string) => void;
  isLoading?: boolean;
}

function cleanOcrText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\f/g, "")
    .replace(/([a-zA-Z])(\d)/g, "$1 $2")
    .replace(/(\d)([a-zA-Z])/g, "$1 $2")
    .replace(/\|/g, "I")
    .replace(/l(?=\d)/g, "1")
    .replace(/O(?=\d)/g, "0")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function UploadArea({ onTextExtracted, isLoading }: UploadAreaProps) {
  const [activeTab, setActiveTab] = useState("image");
  const [isDragging, setIsDragging] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionDone, setExtractionDone] = useState(false);
  const [manualText, setManualText] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const workerRef = useRef<Awaited<ReturnType<typeof createWorker>> | null>(null);

  const processImage = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;

    setPreviewImage(URL.createObjectURL(file));
    setIsExtracting(true);
    setExtractionDone(false);
    setOcrProgress(0);
    setOcrStatus("Initializing OCR engine...");

    try {
      const worker = await createWorker("eng", 1, {
        logger: (m) => {
          if (m.status === "loading tesseract core") setOcrStatus("Loading OCR core...");
          else if (m.status === "loading language traineddata") setOcrStatus("Loading English model...");
          else if (m.status === "initializing api") setOcrStatus("Initializing...");
          else if (m.status === "recognizing text") {
            setOcrStatus("Recognizing text...");
            setOcrProgress(Math.round(m.progress * 100));
          }
        },
      });

      workerRef.current = worker;

      await worker.setParameters({
        tessedit_pageseg_mode: "6" as string,
        preserve_interword_spaces: "1" as string,
      });

      const { data } = await worker.recognize(file);
      await worker.terminate();
      workerRef.current = null;

      const cleaned = cleanOcrText(data.text);
      setOcrStatus("Done!");
      setOcrProgress(100);
      setExtractionDone(true);

      setTimeout(() => {
        onTextExtracted(cleaned);
        setIsExtracting(false);
        setOcrProgress(0);
        setOcrStatus("");
        setExtractionDone(false);
      }, 800);
    } catch (error) {
      console.error("OCR Error:", error);
      setOcrStatus("Error during extraction.");
      setIsExtracting(false);
      setOcrProgress(0);
    }
  }, [onTextExtracted]);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate().catch(() => {});
    };
  }, []);

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
    setOcrProgress(0);
    setOcrStatus("");
  };

  return (
    <Card className="w-full bg-white dark:bg-card border-border shadow-sm">
      <CardContent className="p-6">
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
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {extractionDone ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        )}
                        <span className="text-sm font-medium text-foreground">{ocrStatus}</span>
                      </div>
                      <span className="text-sm font-mono text-muted-foreground">{ocrProgress}%</span>
                    </div>
                    <Progress value={ocrProgress} className="h-1.5" data-testid="progress-bar" />
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
