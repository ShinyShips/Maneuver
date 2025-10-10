import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { detectDataType } from "@/lib/uploadHandlers/dataTypeDetector";
import { handleScoutingDataUpload, type UploadMode } from "@/lib/uploadHandlers/scoutingDataUploadHandler";
import { handleScoutProfilesUpload } from "@/lib/uploadHandlers/scoutProfilesUploadHandler";
import { handlePitScoutingUpload } from "@/lib/uploadHandlers/pitScoutingUploadHandler";
import { handlePitScoutingImagesUpload } from "@/lib/uploadHandlers/pitScoutingImagesUploadHandler";

type JSONUploaderProps = {
  onBack: () => void;
};

const JSONUploader: React.FC<JSONUploaderProps> = ({ onBack }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [detectedDataType, setDetectedDataType] = useState<'scouting' | 'scoutProfiles' | 'pitScouting' | 'pitScoutingImagesOnly' | null>(null);

  type FileSelectEvent = React.ChangeEvent<HTMLInputElement>

  const handleFileSelect = async (event: FileSelectEvent): Promise<void> => {
    const file: File | undefined = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error("Please select a JSON file");
      return;
    }

    try {
      const text = await file.text();
      const jsonData: unknown = JSON.parse(text);
      const dataType = detectDataType(jsonData);
      
      if (!dataType) {
        toast.error("Unable to detect data type. Please check the JSON format.");
        return;
      }

      setSelectedFile(file);
      setDetectedDataType(dataType);
      
      const dataTypeNames = {
        scouting: 'Scouting Data',
        scoutProfiles: 'Scout Profiles',
        pitScouting: 'Pit Scouting Data',
        pitScoutingImagesOnly: 'Pit Scouting Images Only'
      };
      
      toast.info(`Selected: ${file.name} (${dataTypeNames[dataType]})`);
    } catch (error) {
      toast.error("Invalid JSON file");
      console.error("File parsing error:", error);
    }
  };

  const handleUpload = async (mode: UploadMode): Promise<void> => {
    if (!selectedFile || !detectedDataType) {
      toast.error("Please select a file first");
      return;
    }

    try {
      const text = await selectedFile.text();
      const jsonData: unknown = JSON.parse(text);

      if (detectedDataType === 'scouting') {
        await handleScoutingDataUpload(jsonData, mode);
      } else if (detectedDataType === 'scoutProfiles') {
        await handleScoutProfilesUpload(jsonData, mode);
      } else if (detectedDataType === 'pitScouting') {
        await handlePitScoutingUpload(jsonData, mode);
      } else if (detectedDataType === 'pitScoutingImagesOnly') {
        await handlePitScoutingImagesUpload(jsonData);
      }

      setSelectedFile(null);
      setDetectedDataType(null);
      // Reset file input
      const fileInput = document.getElementById("jsonFileInput") as HTMLInputElement | null;
      if (fileInput) fileInput.value = "";

    } catch (error) {
      toast.error("Error processing file");
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
        </div>

        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-center">Upload JSON Data</CardTitle>
            <CardDescription className="text-center">
              Upload JSON data files to import scouting data, scout profiles, or pit scouting data. The system will automatically detect the data type.
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
              {selectedFile 
                ? `Selected: ${selectedFile.name}${detectedDataType ? ` (${detectedDataType === 'scouting' ? 'Scouting Data' : detectedDataType === 'scoutProfiles' ? 'Scout Profiles' : detectedDataType === 'pitScouting' ? 'Pit Scouting Data' : 'Pit Scouting Images Only'})` : ''}`
                : "Select JSON Data File"
              }
            </Button>

            {/* Upload Options */}
            {selectedFile && (
              <>
                <Separator />
                {detectedDataType === 'pitScoutingImagesOnly' ? (
                  /* Images-only upload doesn't need mode selection */
                  <div className="space-y-3">
                    <Button
                      onClick={() => handleUpload("smart-merge")}
                      className="w-full h-16 text-xl bg-green-500 hover:bg-green-600 text-white"
                    >
                      📷 Update Existing Teams with Images
                    </Button>
                    <p><strong>Image Merge</strong>: Add images to existing pit scouting entries for matching teams and events</p>
                    <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded border">
                      <strong>Note:</strong> Images can only be added to teams that already have pit scouting entries. Import pit scouting text data first via QR codes or JSON, then add images.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Button
                      onClick={() => handleUpload("smart-merge")}
                      className="w-full h-16 text-xl bg-green-500 hover:bg-green-600 text-white"
                    >
                      🧠 Smart Merge (Recommended)
                    </Button>
                     <p><strong>Smart Merge</strong>: Skip duplicates, add only new entries</p>
                    <div className="flex items-center gap-4">
                      <Separator className="flex-1" />
                      <span className="text-sm text-muted-foreground">OR</span>
                      <Separator className="flex-1" />
                    </div>
                    
                    <Button
                      onClick={() => handleUpload("append")}
                      className="w-full h-16 text-xl bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      📤 Force Append
                    </Button>
                     <p className="pb-4"><strong>Force Append</strong>: Add all data (may create duplicates)</p>
                    <Button
                      onClick={() => handleUpload("overwrite")}
                      variant="destructive"
                      className="w-full h-16 text-xl text-white"
                    >
                      🔄 Replace All Data
                    </Button>
                    <p><strong>Replace All</strong>: Completely overwrite existing data</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default JSONUploader;