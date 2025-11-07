import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Database, Calendar, Users, MapPin, AlertTriangle, ShieldCheck } from 'lucide-react';
import { getStoredPitAddresses, getStoredPitData, getStoredNexusTeams } from '@/lib/nexusUtils';
import { getAllStoredEventTeams } from '@/lib/tbaUtils';
import { getCachedTBAEventMatches, getCacheExpiration } from '@/lib/tbaCache';

interface DataStatusCardProps {
  eventKey: string;
}

interface StatusItem {
  label: string;
  status: 'loaded' | 'empty' | 'partial';
  count?: number;
  details?: string;
  icon: React.ElementType;
}

export const DataStatusCard: React.FC<DataStatusCardProps> = ({
  eventKey
}) => {
  const [validationData, setValidationData] = React.useState<{
    count: number;
    isExpired: boolean;
  } | null>(null);

  // Check validation data cache
  React.useEffect(() => {
    if (!eventKey.trim()) {
      setValidationData(null);
      return;
    }

    const checkValidationData = async () => {
      try {
        const matches = await getCachedTBAEventMatches(eventKey, true); // Include expired
        const expiration = await getCacheExpiration(eventKey);
        
        setValidationData({
          count: matches.length,
          isExpired: expiration.isExpired
        });
      } catch (error) {
        console.error('Error checking validation data:', error);
        setValidationData(null);
      }
    };

    checkValidationData();
  }, [eventKey]);

  if (!eventKey.trim()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">Enter an event key to view data status</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Check various data sources
  const hasMatchData = localStorage.getItem('matchData') !== null && localStorage.getItem('matchData') !== '';
  
  // Check for stakes awarded (indicates prediction processing has occurred)
  const stakesKeys = Object.keys(localStorage).filter(key => key.startsWith(`stakesAwarded_${eventKey}_`));
  const hasStakesAwarded = stakesKeys.length > 0;
  const stakesProcessedMatches = stakesKeys.length;
  
  // Check TBA teams
  const tbaTeams = getAllStoredEventTeams();
  const hasTBATeams = tbaTeams[eventKey] && tbaTeams[eventKey].length > 0;
  const tbaTeamCount = hasTBATeams ? tbaTeams[eventKey].length : 0;
  
  // Check Nexus teams
  const nexusTeams = getStoredNexusTeams(eventKey);
  const hasNexusTeams = nexusTeams && nexusTeams.length > 0;
  const nexusTeamCount = hasNexusTeams ? nexusTeams.length : 0;
  
  // Check pit data
  const pitAddresses = getStoredPitAddresses(eventKey);
  const pitData = getStoredPitData(eventKey);
  const hasPitAddresses = pitAddresses && Object.keys(pitAddresses).length > 0;
  const hasPitMap = pitData.map !== null;
  const pitAddressCount = hasPitAddresses ? Object.keys(pitAddresses).length : 0;

  // Determine team status
  let teamStatus: 'loaded' | 'empty' | 'partial' = 'empty';
  let teamCount = 0;
  let teamDetails = '';
  
  if (hasTBATeams || hasNexusTeams) {
    // If we have teams from either source, consider it loaded
    teamStatus = 'loaded';
    teamCount = Math.max(tbaTeamCount, nexusTeamCount);
    
    if (hasTBATeams && hasNexusTeams) {
      teamDetails = `TBA: ${tbaTeamCount}, Nexus: ${nexusTeamCount}`;
    } else {
      teamDetails = hasTBATeams ? `TBA: ${tbaTeamCount}` : `Nexus: ${nexusTeamCount}`;
    }
  }

  // Determine pit data status
  let pitStatus: 'loaded' | 'empty' | 'partial' = 'empty';
  let pitDetails = '';
  
  if (hasPitAddresses && hasPitMap) {
    pitStatus = 'loaded';
    pitDetails = `${pitAddressCount} addresses + map`;
  } else if (hasPitAddresses || hasPitMap) {
    pitStatus = 'partial';
    pitDetails = hasPitAddresses ? `${pitAddressCount} addresses` : 'Map only';
  }

  // Determine validation data status
  let validationStatus: 'loaded' | 'empty' | 'partial' = 'empty';
  let validationDetails = '';
  
  if (validationData && validationData.count > 0) {
    if (validationData.isExpired) {
      validationStatus = 'partial';
      validationDetails = 'Cache expired (offline-first preserved)';
    } else {
      validationStatus = 'loaded';
      validationDetails = 'Fresh data from TBA';
    }
  }

  const statusItems: StatusItem[] = [
    {
      label: 'Match Schedule',
      status: hasMatchData ? 'loaded' : 'empty',
      count: hasMatchData ? (JSON.parse(localStorage.getItem('matchData') || '[]')).length : 0,
      icon: Calendar
    },
    {
      label: 'Match Validation Data',
      status: validationStatus,
      count: validationData?.count || 0,
      details: validationDetails,
      icon: ShieldCheck
    },
    {
      label: 'Prediction Processing',
      status: hasStakesAwarded ? 'loaded' : 'empty',
      count: stakesProcessedMatches,
      details: hasStakesAwarded ? 'Stakes awarded to scouts' : 'No predictions processed yet',
      icon: CheckCircle
    },
    {
      label: 'Event Teams',
      status: teamStatus,
      count: teamCount,
      details: teamDetails,
      icon: Users
    },
    {
      label: 'Pit Data',
      status: pitStatus,
      count: pitAddressCount,
      details: pitDetails,
      icon: MapPin
    }
  ];

  const getStatusColor = (status: StatusItem['status']) => {
    switch (status) {
      case 'loaded': return 'bg-green-100 text-green-800 border-green-200';
      case 'partial': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'empty': return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getStatusText = (status: StatusItem['status']) => {
    switch (status) {
      case 'loaded': return 'Loaded';
      case 'partial': return 'Partial';
      case 'empty': return 'Not Loaded';
    }
  };

  const getStatusIcon = (status: StatusItem['status']) => {
    switch (status) {
      case 'loaded': return CheckCircle;
      case 'partial': return AlertTriangle;
      case 'empty': return XCircle;
    }
  };

  const loadedCount = statusItems.filter(item => item.status === 'loaded').length;
  const partialCount = statusItems.filter(item => item.status === 'partial').length;
  const totalItems = statusItems.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Data Status
          <Badge variant="outline" className="ml-auto">
            {eventKey}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Status Summary */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Overall:</span>
          <Badge className={getStatusColor(loadedCount === totalItems ? 'loaded' : loadedCount > 0 || partialCount > 0 ? 'partial' : 'empty')}>
            {loadedCount}/{totalItems} Data Types Loaded
          </Badge>
        </div>

        {/* Individual Status Items */}
        <div className="space-y-3">
          {statusItems.map((item) => {
            const StatusIcon = getStatusIcon(item.status);
            const ItemIcon = item.icon;
            
            return (
              <div key={item.label} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-3">
                  <ItemIcon className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">{item.label}</span>
                    {item.details && (
                      <span className="text-xs text-muted-foreground">{item.details}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {item.count !== undefined && item.count > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {item.count}
                    </Badge>
                  )}
                  <div className="flex items-center gap-1">
                    <StatusIcon className={`h-4 w-4 ${
                      item.status === 'loaded' ? 'text-green-600' : 
                      item.status === 'partial' ? 'text-yellow-600' : 
                      'text-gray-400'
                    }`} />
                    <span className={`text-xs font-medium ${
                      item.status === 'loaded' ? 'text-green-600' : 
                      item.status === 'partial' ? 'text-yellow-600' : 
                      'text-gray-400'
                    }`}>
                      {getStatusText(item.status)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Status Legend */}
        <div className="pt-2 border-t">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <span>Loaded</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-yellow-600" />
              <span>Partial</span>
            </div>
            <div className="flex items-center gap-1">
              <XCircle className="h-3 w-3 text-gray-400" />
              <span>Not Loaded</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
