import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type JSONUploaderProps = {
  onBack: () => void;
  onSwitchToDownload: () => void;
};

const JSONUploader: React.FC<JSONUploaderProps> = ({ onBack, onSwitchToDownload }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  type FileSelectEvent = React.ChangeEvent<HTMLInputElement>

  const handleFileSelect = (event: FileSelectEvent): void => {
    const file: File | undefined = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error("Please select a JSON file");
      return;
    }

    setSelectedFile(file);
    toast.info(`Selected: ${file.name}`);
  };

  interface RawScoutingData {
    data: unknown[];
  }

  type ProcessedScoutingData = unknown[][];

  type UploadMode = "append" | "overwrite";

  const handleUpload = async (mode: UploadMode): Promise<void> => {
    if (!selectedFile) {
      toast.error("Please select a file first");
      return;
    }

    try {
      const text = await selectedFile.text();
      const jsonData: unknown = JSON.parse(text);

      // Validate scouting data structure
      let newData: unknown[] = [];
      if (
        typeof jsonData === "object" &&
        jsonData !== null &&
        "data" in jsonData &&
        Array.isArray((jsonData as RawScoutingData).data)
      ) {
        // Raw scouting data format
        newData = (jsonData as RawScoutingData).data;
      } else if (Array.isArray(jsonData)) {
        // Processed scouting data format - skip header row if it exists
        const hasHeaderRow =
          jsonData.length > 0 &&
          Array.isArray(jsonData[0]) &&
          typeof jsonData[0][0] === "string" &&
          jsonData[0].some(
            (cell: unknown) =>
              typeof cell === "string" &&
              (cell.includes("match") || cell.includes("team"))
          );

        newData = hasHeaderRow ? (jsonData as ProcessedScoutingData).slice(1) : (jsonData as ProcessedScoutingData);
      } else {
        toast.error("Invalid scouting data format");
        return;
      }

      if (mode === "overwrite") {
        // Overwrite existing data
        const scoutingData: RawScoutingData = { data: newData };
        localStorage.setItem("scoutingData", JSON.stringify(scoutingData));
        toast.success(`Overwritten with ${newData.length} scouting entries`);
      } else if (mode === "append") {
        // Append to existing data
        const existingDataStr = localStorage.getItem("scoutingData");
        let existingData: unknown[] = [];

        if (existingDataStr) {
          try {
            const parsed: unknown = JSON.parse(existingDataStr);
            existingData =
              typeof parsed === "object" &&
              parsed !== null &&
              "data" in parsed &&
              Array.isArray((parsed as RawScoutingData).data)
                ? (parsed as RawScoutingData).data
                : [];
          } catch (error) {
            console.warn("Could not parse existing data, starting fresh: " + error);
          }
        }

        const mergedData: RawScoutingData = { data: [...existingData, ...newData] };
        localStorage.setItem("scoutingData", JSON.stringify(mergedData));
        toast.success(
          `Appended ${newData.length} entries to existing ${existingData.length} entries (Total: ${mergedData.data.length})`
        );
      }

      setSelectedFile(null);
      // Reset file input
      const fileInput = document.getElementById("jsonFileInput") as HTMLInputElement | null;
      if (fileInput) fileInput.value = "";

    } catch (error) {
      toast.error("Error parsing JSON file");
      console.error("Upload error:", error);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col items-center gap-6 px-4 pt-[var(--header-height)]">
      <div className="flex flex-col items-center gap-6 max-w-md w-full">
        {/* Navigation Header */}
        <div className="flex items-center justify-between w-full">
          <Button 
            onClick={onBack} 
            variant="ghost" 
            size="sm"
            className="flex items-center gap-2"
          >
            ← Back
          </Button>
          <Button 
            onClick={onSwitchToDownload} 
            variant="outline" 
            size="sm"
          >
            Switch to Download
          </Button>
        </div>

        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-center">Upload Scouting Data</CardTitle>
            <CardDescription className="text-center">
              Upload JSON scouting data files to either overwrite your current data or append to your existing collection.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* File Selection */}
            <input
              type="file"
              id="jsonFileInput"
              accept=".json"
              style={{ display: "none" }}
              onChange={handleFileSelect}
            />
            
            <Button
              onClick={() => {
                const input = document.getElementById("jsonFileInput");
                if (input) input.click();
              }}
              variant="outline"
              className="w-full min-h-16 text-xl whitespace-normal text-wrap py-3 px-4"
            >
              {selectedFile ? `Selected: ${selectedFile.name}` : "Select Scouting Data JSON"}
            </Button>

            {/* Upload Options */}
            {selectedFile && (
              <>
                <Separator />
                <div className="space-y-3">
                  <Button
                    onClick={() => handleUpload("append")}
                    className="w-full h-16 text-xl"
                  >
                    Append to Existing Data
                  </Button>
                  
                  <div className="flex items-center gap-4">
                    <Separator className="flex-1" />
                    <span className="text-sm text-muted-foreground">OR</span>
                    <Separator className="flex-1" />
                  </div>
                  
                  <Button
                    onClick={() => handleUpload("overwrite")}
                    variant="destructive"
                    className="w-full h-16 text-xl"
                  >
                    Overwrite All Data
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Alert>
          <AlertDescription>
            <div className="space-y-1">
              <p>• Append: Add data to your existing collection</p>
              <p>• Overwrite: Replace all current scouting data</p>
              <p>• Supports both raw and processed JSON formats</p>
              {selectedFile && (
                <div className="mt-2">
                  <Badge variant="outline">Ready: {selectedFile.name}</Badge>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
};

export default JSONUploader;