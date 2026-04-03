import { useState, useCallback, useEffect } from "react";
import { createWorker } from "tesseract.js";
import { UploadCloud, Image as ImageIcon, Type, FileImage, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";

interface UploadAreaProps {
  onTextExtracted: (text: string) => void;
  isLoading?: boolean;
}

export function UploadArea({ onTextExtracted, isLoading }: UploadAreaProps) {
  const [activeTab, setActiveTab] = useState("image");
  const [isDragging, setIsDragging] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [isExtracting, setIsExtracting] = useState(false);
  const [manualText, setManualText] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const processImage = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    
    setPreviewImage(URL.createObjectURL(file));
    setIsExtracting(true);
    setOcrProgress(0);

    try {
      const worker = await createWorker('eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100));
          }
        }
      });
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();
      onTextExtracted(text.trim());
    } catch (error) {
      console.error("OCR Error:", error);
    } finally {
      setIsExtracting(false);
      setOcrProgress(0);
    }
  };

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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processImage(e.dataTransfer.files[0]);
    }
  }, []);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (activeTab !== "image") return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) processImage(file);
          break;
        }
      }
    };
    
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [activeTab]);

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
            {!isExtracting && !previewImage ? (
              <div
                className={`relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg transition-colors cursor-pointer ${
                  isDragging ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/50"
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
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
                  <p className="mb-2 text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">PNG, JPG or paste from clipboard (Ctrl+V)</p>
                </div>
              </div>
            ) : isExtracting ? (
              <div className="flex flex-col items-center justify-center w-full h-64 border rounded-lg bg-secondary/20" data-testid="extracting-indicator">
                <Loader2 className="w-8 h-8 mb-4 animate-spin text-primary" />
                <p className="mb-4 text-sm font-medium">Extracting text...</p>
                <div className="w-64">
                  <Progress value={ocrProgress} className="h-2" data-testid="progress-bar" />
                </div>
              </div>
            ) : (
              <div className="relative flex flex-col items-center justify-center w-full h-64 border rounded-lg overflow-hidden bg-black/5" data-testid="preview-container">
                <img src={previewImage!} alt="Preview" className="object-contain w-full h-full p-2" />
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewImage(null);
                  }}
                  className="absolute top-2 right-2 p-2 bg-background/80 backdrop-blur-sm rounded-md shadow-sm hover:bg-background transition-colors text-sm font-medium"
                  data-testid="button-clear-image"
                >
                  Clear Image
                </button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="text" className="mt-0">
            <div className="flex flex-col space-y-4">
              <Textarea
                placeholder="Type or paste your question text here..."
                className="min-h-[200px] resize-y"
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
