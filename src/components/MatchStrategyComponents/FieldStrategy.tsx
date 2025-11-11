import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/animate-ui/radix/tabs";
import FieldCanvas from "./FieldCanvas";

interface FieldStrategyProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  selectedTeams?: string[];
  matchNumber?: string;
}

export const FieldStrategy = ({ activeTab, onTabChange, selectedTeams = [], matchNumber }: FieldStrategyProps) => {
  return (
    <Card className="w-full">
      <CardContent className="h-[500px] p-4">
        <Tabs value={activeTab} onValueChange={onTabChange} className="w-full h-full flex flex-col" enableSwipe={true}>
          <TabsList className="grid w-full grid-cols-3 mb-4 flex-shrink-0">
            <TabsTrigger value="autonomous">Autonomous</TabsTrigger>
            <TabsTrigger value="teleop">Teleop</TabsTrigger>
            <TabsTrigger value="endgame">Endgame</TabsTrigger>
          </TabsList>
          
          <div className="flex-1 mt-0">
            <TabsContent value="autonomous" className="h-full mt-0" data-stage="autonomous">
              <FieldCanvas 
                key="autonomous" 
                stageId="autonomous" 
                onStageChange={onTabChange}
                selectedTeams={selectedTeams}
                matchNumber={matchNumber}
              />
            </TabsContent>
            
            <TabsContent value="teleop" className="h-full mt-0" data-stage="teleop">
              <FieldCanvas 
                key="teleop" 
                stageId="teleop" 
                onStageChange={onTabChange}
                selectedTeams={selectedTeams}
                matchNumber={matchNumber}
              />
            </TabsContent>
            
            <TabsContent value="endgame" className="h-full mt-0" data-stage="endgame">
              <FieldCanvas 
                key="endgame" 
                stageId="endgame" 
                onStageChange={onTabChange}
                selectedTeams={selectedTeams}
                matchNumber={matchNumber}
              />
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
};
