import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/animate-ui/radix/tabs";
import { Eye } from "lucide-react";
import type { ScoutingEntry } from "@/lib/scoutingTypes";
import { FieldPositionVisual } from "@/components/PitScoutingComponents/FieldPositionVisual";

interface MatchStatsButtonProps {
  matchData: ScoutingEntry;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function MatchStatsButton({ matchData, variant = "outline", size = "sm", className = "" }: MatchStatsButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("coral");

  if (!matchData) {
    return (
      <Button variant={variant} size={size} className={className} disabled>
        <Eye className="w-3 h-3" />
      </Button>
    );
  }

  // Calculate totals
  const autoCoralTotal = matchData.autoCoralPlaceL1Count + matchData.autoCoralPlaceL2Count + 
                         matchData.autoCoralPlaceL3Count + matchData.autoCoralPlaceL4Count;
  const teleopCoralTotal = matchData.teleopCoralPlaceL1Count + matchData.teleopCoralPlaceL2Count + 
                           matchData.teleopCoralPlaceL3Count + matchData.teleopCoralPlaceL4Count;
  const totalCoralTotal = autoCoralTotal + teleopCoralTotal;

  const autoAlgaeTotal = matchData.autoAlgaePlaceNetShot + matchData.autoAlgaePlaceProcessor;
  const teleopAlgaeTotal = matchData.teleopAlgaePlaceNetShot + matchData.teleopAlgaePlaceProcessor;
  const totalAlgaeTotal = autoAlgaeTotal + teleopAlgaeTotal;

  // Get start position
  const startPosition = [
    matchData.startPoses0,
    matchData.startPoses1,
    matchData.startPoses2,
    matchData.startPoses3,
    matchData.startPoses4,
    matchData.startPoses5
  ].findIndex(pos => pos);

  // Determine climb status
  const climbStatus = matchData.climbFailed ? "Failed" :
                     matchData.deepClimbAttempted ? "Deep Climb" :
                     matchData.shallowClimbAttempted ? "Shallow Climb" :
                     matchData.parkAttempted ? "Park" : "None";

  // Simplify alliance name (remove "Alliance" suffix)
  const allianceName = matchData.alliance.replace(/Alliance$/i, '').trim();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <Eye className="w-4 h-4 mr-2" />
          View Full Match Data
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl w-[calc(100vw-2rem)] h-[min(600px,90vh)] flex flex-col p-6">
        <DialogHeader className="flex-shrink-0 px-0">
          <DialogTitle>
            Match {matchData.matchNumber} - Team {matchData.selectTeam}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 min-h-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col" enableSwipe={true}>
            <TabsList className="grid w-full grid-cols-4 flex-shrink-0">
              <TabsTrigger value="coral">Coral</TabsTrigger>
              <TabsTrigger value="algae">Algae</TabsTrigger>
              <TabsTrigger value="endgame">Endgame</TabsTrigger>
              <TabsTrigger value="info">Info</TabsTrigger>
            </TabsList>
            
            <div className="flex-1 overflow-y-auto px-0">
              <TabsContent value="coral" className="space-y-4 h-full">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Auto Coral Scoring</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Level 1:</span>
                        <span className="font-bold">{matchData.autoCoralPlaceL1Count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Level 2:</span>
                        <span className="font-bold">{matchData.autoCoralPlaceL2Count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Level 3:</span>
                        <span className="font-bold">{matchData.autoCoralPlaceL3Count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Level 4:</span>
                        <span className="font-bold">{matchData.autoCoralPlaceL4Count}</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span>Dropped/Missed:</span>
                        <span className="font-bold">{matchData.autoCoralPlaceDropMissCount}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t">
                        <span className="font-semibold">Total Scored:</span>
                        <span className="font-bold text-blue-600">{autoCoralTotal}</span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <h5 className="text-sm font-semibold mb-2">Auto Coral Pickups</h5>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Preload:</span>
                          <span>{matchData.autoCoralPickPreloadCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Station:</span>
                          <span>{matchData.autoCoralPickStationCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Mark 1:</span>
                          <span>{matchData.autoCoralPickMark1Count}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Mark 2:</span>
                          <span>{matchData.autoCoralPickMark2Count}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Mark 3:</span>
                          <span>{matchData.autoCoralPickMark3Count}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">Teleop Coral Scoring</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Level 1:</span>
                        <span className="font-bold">{matchData.teleopCoralPlaceL1Count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Level 2:</span>
                        <span className="font-bold">{matchData.teleopCoralPlaceL2Count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Level 3:</span>
                        <span className="font-bold">{matchData.teleopCoralPlaceL3Count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Level 4:</span>
                        <span className="font-bold">{matchData.teleopCoralPlaceL4Count}</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span>Dropped/Missed:</span>
                        <span className="font-bold">{matchData.teleopCoralPlaceDropMissCount}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t">
                        <span className="font-semibold">Total Scored:</span>
                        <span className="font-bold text-purple-600">{teleopCoralTotal}</span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <h5 className="text-sm font-semibold mb-2">Teleop Coral Pickups</h5>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Station:</span>
                          <span>{matchData.teleopCoralPickStationCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Carpet:</span>
                          <span>{matchData.teleopCoralPickCarpetCount}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Combined Totals */}
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h4 className="font-semibold mb-3">Combined Totals (Auto + Teleop)</h4>
                  <div className="grid grid-cols-2 gap-4 pb-2">
                    <div className="flex justify-between">
                      <span>Level 1:</span>
                      <span className="font-bold">{matchData.autoCoralPlaceL1Count + matchData.teleopCoralPlaceL1Count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Level 2:</span>
                      <span className="font-bold">{matchData.autoCoralPlaceL2Count + matchData.teleopCoralPlaceL2Count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Level 3:</span>
                      <span className="font-bold">{matchData.autoCoralPlaceL3Count + matchData.teleopCoralPlaceL3Count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Level 4:</span>
                      <span className="font-bold">{matchData.autoCoralPlaceL4Count + matchData.teleopCoralPlaceL4Count}</span>
                    </div>
                  </div>
                  <div className="flex justify-between pt-2 border-t font-semibold">
                    <span>Total Coral Scored:</span>
                    <span className="text-green-600">{totalCoralTotal}</span>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="algae" className="space-y-4 h-full">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Auto Algae Scoring</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Net Shots:</span>
                        <span className="font-bold">{matchData.autoAlgaePlaceNetShot}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Processor:</span>
                        <span className="font-bold">{matchData.autoAlgaePlaceProcessor}</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span>Dropped/Missed:</span>
                        <span className="font-bold">{matchData.autoAlgaePlaceDropMiss}</span>
                      </div>
                      <div className="flex justify-between text-orange-600">
                        <span>Removed:</span>
                        <span className="font-bold">{matchData.autoAlgaePlaceRemove}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t">
                        <span className="font-semibold">Total Scored:</span>
                        <span className="font-bold text-green-600">{autoAlgaeTotal}</span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <h5 className="text-sm font-semibold mb-2">Auto Algae Pickups</h5>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Reef:</span>
                          <span>{matchData.autoAlgaePickReefCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Mark 1:</span>
                          <span>{matchData.autoAlgaePickMark1Count}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Mark 2:</span>
                          <span>{matchData.autoAlgaePickMark2Count}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Mark 3:</span>
                          <span>{matchData.autoAlgaePickMark3Count}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">Teleop Algae Scoring</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Net Shots:</span>
                        <span className="font-bold">{matchData.teleopAlgaePlaceNetShot}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Processor:</span>
                        <span className="font-bold">{matchData.teleopAlgaePlaceProcessor}</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span>Dropped/Missed:</span>
                        <span className="font-bold">{matchData.teleopAlgaePlaceDropMiss}</span>
                      </div>
                      <div className="flex justify-between text-orange-600">
                        <span>Removed:</span>
                        <span className="font-bold">{matchData.teleopAlgaePlaceRemove}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t">
                        <span className="font-semibold">Total Scored:</span>
                        <span className="font-bold text-orange-600">{teleopAlgaeTotal}</span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <h5 className="text-sm font-semibold mb-2">Teleop Algae Pickups</h5>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Reef:</span>
                          <span>{matchData.teleopAlgaePickReefCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Carpet:</span>
                          <span>{matchData.teleopAlgaePickCarpetCount}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Combined Algae Total */}
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex justify-between font-semibold">
                    <span>Total Algae Scored (Auto + Teleop):</span>
                    <span className="text-green-600">{totalAlgaeTotal}</span>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="endgame" className="space-y-4 h-full">
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Endgame Performance</h4>
                    <div className="space-y-3">
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Climb Status:</span>
                          <span className={`font-bold ${
                            climbStatus === "Deep Climb" ? "text-green-600" :
                            climbStatus === "Shallow Climb" ? "text-blue-600" :
                            climbStatus === "Park" ? "text-yellow-600" :
                            climbStatus === "Failed" ? "text-red-600" :
                            "text-gray-600"
                          }`}>
                            {climbStatus}
                          </span>
                        </div>
                      </div>
                      
                      {matchData.climbFailed && (
                        <div className="p-3 bg-red-50 dark:bg-red-950 rounded border border-red-200 dark:border-red-800">
                          <p className="text-sm text-red-800 dark:text-red-200">
                            ⚠️ Climb attempt failed
                          </p>
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            checked={matchData.shallowClimbAttempted} 
                            disabled 
                            className="rounded"
                          />
                          <span>Shallow Climb Attempted</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            checked={matchData.deepClimbAttempted} 
                            disabled 
                            className="rounded"
                          />
                          <span>Deep Climb Attempted</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            checked={matchData.parkAttempted} 
                            disabled 
                            className="rounded"
                          />
                          <span>Park Attempted</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-3">Other Performance</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          checked={matchData.playedDefense} 
                          disabled 
                          className="rounded"
                        />
                        <span>Played Defense</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          checked={matchData.brokeDown} 
                          disabled 
                          className="rounded"
                        />
                        <span className="text-red-600">Broke Down</span>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="info" className="space-y-4 h-full">
                <div>
                  <h4 className="font-semibold mb-3">Match Information</h4>
                  <div className="space-y-3">
                    {/* 2x2 Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
                        <div className="text-sm text-muted-foreground">Match Number</div>
                        <div className="text-lg font-bold">{matchData.matchNumber}</div>
                      </div>
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
                        <div className="text-sm text-muted-foreground">Team Number</div>
                        <div className="text-lg font-bold">{matchData.selectTeam}</div>
                      </div>
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
                        <div className="text-sm text-muted-foreground">Alliance</div>
                        <div className="text-lg font-bold capitalize">{allianceName}</div>
                      </div>
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
                        <div className="text-sm text-muted-foreground">Event</div>
                        <div className="text-lg font-bold">{matchData.eventName || "Unknown Event"}</div>
                      </div>
                    </div>
                    
                    {/* scout - Full Width */}
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
                      <div className="text-sm text-muted-foreground">scout</div>
                      <div className="text-lg font-bold">{matchData.scoutName || "Unknown"}</div>
                    </div>
                    
                    {/* Start Position Visual - Full Width */}
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
                      <div className="text-sm text-muted-foreground mb-2">Start Position</div>
                      {startPosition !== -1 ? (
                        <div className="w-full h-52 mb-2">
                          <FieldPositionVisual selectedPosition={startPosition} />
                        </div>
                      ) : (
                        <div className="text-lg font-bold">Unknown</div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        checked={matchData.autoPassedStartLine} 
                        disabled 
                        className="rounded"
                      />
                      <span>Passed Start Line (Auto)</span>
                    </div>
                    
                    {matchData.comment && (
                      <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
                        <h5 className="font-semibold mb-2">Scout Comments</h5>
                        <p className="text-sm">{matchData.comment}</p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
