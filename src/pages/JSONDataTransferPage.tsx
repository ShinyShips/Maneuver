
import { useState } from "react";
import Button from "@/components/ui/button";
import JSONUploader from "@/components/DataTransferComponents/JSONUploader";
import { convertArrayOfArraysToCSV, SCOUTING_DATA_HEADER } from "@/lib/utils";
import { loadScoutingData } from "@/lib/scoutingDataUtils";
import { loadPitScoutingData, exportPitScoutingToCSV, downloadPitScoutingImagesOnly } from "@/lib/pitScoutingUtils";
import { gameDB } from "@/lib/dexieDB";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


const JSONDataTransferPage = () => {
  const [mode, setMode] = useState<'select' | 'upload'>('select');
  const [dataType, setDataType] = useState<'scouting' | 'scoutProfiles' | 'pitScouting' | 'pitScoutingImagesOnly'>('scouting');

  if (mode === 'upload') {
    return (
      <JSONUploader 
        onBack={() => setMode('select')} 
      />
    );
  }

  const handleDownloadCSV = async () => {
    try {
      let csv: string;
      let filename: string;

      switch (dataType) {
        case 'scouting': {
          const scoutingDataWithIds = await loadScoutingData();
          
          if (scoutingDataWithIds.entries.length === 0) {
            alert("No scouting data found.");
            return;
          }

          // Convert data entries (with IDs) to arrays using the header order
          const dataArrays = scoutingDataWithIds.entries.map(entry => 
            SCOUTING_DATA_HEADER.map(header => {
              if (header === 'id') {
                return entry.id;
              }
              const value = (entry.data as Record<string, unknown>)[header];
              return value ?? '';
            })
          );
          
          const finalDataArr = [SCOUTING_DATA_HEADER, ...dataArrays];
          
          csv = convertArrayOfArraysToCSV(finalDataArr as (string | number)[][]);
          filename = `ManeuverScoutingData-${new Date().toLocaleTimeString()}-local.csv`;
          break;
        }
        case 'pitScouting': {
          csv = await exportPitScoutingToCSV();
          if (!csv || csv.split('\n').length <= 1) {
            alert("No pit scouting data found.");
            return;
          }
          filename = `ManeuverPitScoutingData-${new Date().toLocaleTimeString()}-local.csv`;
          break;
        }
        case 'pitScoutingImagesOnly': {
          alert("CSV export not available for images-only data. Use JSON download instead.");
          return;
        }
        case 'scoutProfiles': {
          // CSV export for scout profiles
          const scoutsData = await gameDB.scouts.toArray();
          const predictionsData = await gameDB.predictions.toArray();
          
          if (scoutsData.length === 0 && predictionsData.length === 0) {
            alert("No scout profiles data found.");
            return;
          }

          // Create CSV for scout profiles
          const scoutHeaders = ['Name', 'Stakes', 'Stakes From Predictions', 'Total Predictions', 'Correct Predictions', 'Accuracy %', 'Current Streak', 'Longest Streak', 'Created At', 'Last Updated'];
          const scoutRows = scoutsData.map(scout => [
            scout.name,
            scout.stakes,
            scout.stakesFromPredictions,
            scout.totalPredictions,
            scout.correctPredictions,
            scout.totalPredictions > 0 ? Math.round((scout.correctPredictions / scout.totalPredictions) * 100) : 0,
            scout.currentStreak,
            scout.longestStreak,
            new Date(scout.createdAt).toLocaleDateString(),
            new Date(scout.lastUpdated).toLocaleDateString()
          ]);
          
          const scoutCsvData = [scoutHeaders, ...scoutRows];
          csv = convertArrayOfArraysToCSV(scoutCsvData as (string | number)[][]);
          filename = `ManeuverScoutProfiles-${new Date().toLocaleTimeString()}-local.csv`;
          break;
        }
        default:
          alert("Unknown data type selected.");
          return;
      }

      const element = document.createElement("a");
      element.setAttribute(
        "href",
        "data:text/csv;charset=utf-8," + encodeURIComponent(csv)
      );
      element.setAttribute("download", filename);
      element.style.display = "none";
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } catch (error) {
      console.error("Failed to export data as CSV:", error);
      alert("Failed to export data as CSV.");
    }
  };

  return (
    <div className="h-screen w-full flex flex-col items-center px-4 pt-6 pb-6">
      <div className="flex flex-col items-start gap-4 max-w-md w-full">
        <h1 className="text-2xl font-bold">JSON Data Transfer</h1>
        <p className="text-muted-foreground">
          Export your data as CSV for analysis, or upload JSON files to overwrite your local data storage. Choose the type of data you want to export below.
        </p>


        <div className="flex flex-col gap-4 w-full">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Data Type to Export:</label>
            <Select value={dataType} onValueChange={(value: 'scouting' | 'scoutProfiles' | 'pitScouting' | 'pitScoutingImagesOnly') => setDataType(value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select data type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scouting">Scouting Data</SelectItem>
                <SelectItem value="scoutProfiles">Scout Profiles</SelectItem>
                <SelectItem value="pitScouting">Pit Scouting Data</SelectItem>
                <SelectItem value="pitScoutingImagesOnly">Pit Scouting Images Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={async () => {
              try {
                let dataToExport: unknown;
                let filename: string;

                switch (dataType) {
                  case 'scouting': {
                    const scoutingDataWithIds = await loadScoutingData();
                    
                    if (scoutingDataWithIds.entries.length === 0) {
                      alert("No scouting data found.");
                      return;
                    }

                    dataToExport = scoutingDataWithIds;
                    filename = `ManeuverScoutingData-${new Date().toLocaleTimeString()}.json`;
                    break;
                  }
                  case 'pitScouting': {
                    const pitData = await loadPitScoutingData();
                    
                    if (pitData.entries.length === 0) {
                      alert("No pit scouting data found.");
                      return;
                    }

                    dataToExport = pitData;
                    filename = `ManeuverPitScoutingData-${new Date().toLocaleTimeString()}.json`;
                    break;
                  }
                  case 'pitScoutingImagesOnly': {
                    try {
                      await downloadPitScoutingImagesOnly();
                      return; // downloadPitScoutingImagesOnly handles its own download
                    } catch (error) {
                      console.error('Error downloading pit scouting images:', error);
                      alert("Failed to download pit scouting images.");
                      return;
                    }
                  }
                  case 'scoutProfiles': {
                    const scoutsData = await gameDB.scouts.toArray();
                    const predictionsData = await gameDB.predictions.toArray();
                    
                    if (scoutsData.length === 0 && predictionsData.length === 0) {
                      alert("No scout profiles data found.");
                      return;
                    }

                    dataToExport = {
                      scouts: scoutsData,
                      predictions: predictionsData,
                      exportedAt: new Date().toISOString(),
                      version: "1.0"
                    };
                    filename = `ManeuverScoutProfiles-${new Date().toLocaleTimeString()}.json`;
                    break;
                  }
                  default:
                    alert("Unknown data type selected.");
                    return;
                }

                const element = document.createElement("a");
                element.setAttribute(
                  "href",
                  "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataToExport, null, 2))
                );
                element.setAttribute("download", filename);
                element.style.display = "none";
                document.body.appendChild(element);
                element.click();
                document.body.removeChild(element);
              } catch (error) {
                console.error("Failed to export data as JSON:", error);
                alert("Failed to export data as JSON.");
              }
            }}
            className="w-full h-16 text-xl"
          >
            Download {dataType === 'scouting' ? 'Scouting Data' : dataType === 'pitScouting' ? 'Pit Scouting Data' : dataType === 'pitScoutingImagesOnly' ? 'Pit Scouting Images' : 'Scout Profiles'} as JSON
          </Button>

          <div className="flex items-center gap-4">
            <Separator className="flex-1" />
            <span className="text-sm text-muted-foreground">OR</span>
            <Separator className="flex-1" />
          </div>

          <div className="w-full">
            <Button
              onClick={handleDownloadCSV}
              variant="secondary"
              disabled={dataType === 'pitScoutingImagesOnly'}
              className="w-full h-16 text-xl"
            >
              {dataType === 'pitScoutingImagesOnly' 
                ? 'Images Cannot Be Downloaded as CSV' 
                : `Download ${dataType === 'scouting' ? 'Scouting Data' : dataType === 'pitScouting' ? 'Pit Scouting Data' : 'Scout Profiles'} as CSV`
              }
            </Button>
            {dataType === 'pitScouting' && (
              <p className="text-xs text-muted-foreground mt-1 text-center">
                CSV export includes team data and capabilities but excludes robot images
              </p>
            )}
          </div>

          <div className="flex items-center gap-4">
            <Separator className="flex-1" />
            <span className="text-sm text-muted-foreground">OR</span>
            <Separator className="flex-1" />
          </div>

          <Button
            onClick={() => setMode('upload')}
            variant="outline"
            className="w-full h-16 text-xl"
          >
            Upload JSON Data
          </Button>
        </div>

        <div className="text-xs text-muted-foreground text-start space-y-1">
          <p>• CSV: Export data for spreadsheet analysis</p>
          <p>• JSON: Export/import data for backup or device transfer</p>
          <p>• Scouting Data: Match performance data</p>
          <p>• Scout Profiles: User achievements and predictions</p>
          <p>• Pit Scouting: Team technical specifications and capabilities</p>
          <p>• Pit Scouting Images Only: Robot photos for merging with existing data (requires text data first)</p>
        </div>
      </div>
    </div>
  );
};

export default JSONDataTransferPage;