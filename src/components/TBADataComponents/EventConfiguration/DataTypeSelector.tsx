import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Database, 
  Trophy, 
  Users,
  MapPin,
  Bug,
  CheckCircle,
  FlaskConical,
} from 'lucide-react';

export type TBADataType = 'match-data' | 'match-results' | 'match-validation-data' | 'event-teams' | 'pit-data' | 'debug-nexus' | 'validation-testing';

interface DataTypeSelectorProps {
  dataType: TBADataType;
  setDataType: (type: TBADataType) => void;
}

const dataTypeOptions = [
  {
    value: 'match-data' as const,
    label: 'Match Schedules',
    icon: Database,
    description: 'Download match schedules for scouting'
  },
  {
    value: 'match-results' as const,
    label: 'Match Results',
    icon: Trophy,
    description: 'Download actual match scores and winners'
  },
  {
    value: 'match-validation-data' as const,
    label: 'Match Validation Data',
    icon: CheckCircle,
    description: 'Load detailed match breakdowns for scouting validation'
  },
  {
    value: 'event-teams' as const,
    label: 'Event Teams',
    icon: Users,
    description: 'Download team list participating in the event'
  },
  {
    value: 'pit-data' as const,
    label: 'Pit Data',
    icon: MapPin,
    description: 'Download pit assignments and map from Nexus'
  },
  {
    value: 'validation-testing' as const,
    label: 'Validation Testing',
    icon: FlaskConical,
    description: 'Test match validation system with scouted and TBA data'
  },
  {
    value: 'debug-nexus' as const,
    label: 'Debug Nexus',
    icon: Bug,
    description: 'Debug Nexus API connectivity and events'
  },
];

export const DataTypeSelector: React.FC<DataTypeSelectorProps> = ({
  dataType,
  setDataType,
}) => {
  const selectedOption = dataTypeOptions.find(option => option.value === dataType);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Data Type</CardTitle>
        <CardDescription>
          Choose what type of data you want to access for the current event
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Data Type Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Data Type</label>
          <Select value={dataType} onValueChange={setDataType}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select data type" />
            </SelectTrigger>
            <SelectContent>
              {dataTypeOptions.map(({ value, label, icon: Icon }) => (
                <SelectItem key={value} value={value}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedOption && (
            <p className="text-xs text-muted-foreground">
              {selectedOption.description}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
