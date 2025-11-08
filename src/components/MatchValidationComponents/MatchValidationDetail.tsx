import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { StatusBadge } from './StatusBadge';
import { AllianceCard } from './AllianceCard';
import { MatchSummaryCard } from './MatchSummaryCard';
import { DiscrepancyList } from './DiscrepancyList';
import { TeamBreakdown } from './TeamBreakdown';
import { RefreshCw, Users, ExternalLink } from 'lucide-react';
import type { MatchValidationResult, Discrepancy } from '@/lib/matchValidationTypes';

interface MatchValidationDetailProps {
  match: MatchValidationResult;
  isOpen: boolean;
  onClose: () => void;
  onReValidate?: () => void;
  formatMatchLabel?: (match: MatchValidationResult) => string;
}

export const MatchValidationDetail: React.FC<MatchValidationDetailProps> = ({
  match,
  isOpen,
  onClose,
  onReValidate,
  formatMatchLabel,
}) => {
  const navigate = useNavigate();
  const matchLabel = formatMatchLabel ? formatMatchLabel(match) : `Match ${match.matchNumber}`;

  // Generate TBA match URL
  const getTBAMatchUrl = () => {
    if (!match.eventKey || !match.matchKey) return null;
    return `https://www.thebluealliance.com/match/${match.matchKey}`;
  };

  // Handler to re-scout a single team
  const handleRescoutTeam = (teamNumber: string, alliance: 'red' | 'blue') => {
    navigate('/game-start', {
      state: {
        rescout: {
          isRescout: true,
          matchNumber: match.matchNumber,
          teamNumber: teamNumber,
          alliance: alliance,
          eventKey: match.eventKey
        }
      }
    });
  };

  // Handler to re-scout entire alliance
  const handleRescoutAlliance = (alliance: 'red' | 'blue') => {
    const teams = match.teams
      ?.filter(t => t.alliance === alliance)
      .map(t => t.teamNumber) || [];
    
    if (teams.length === 0) {
      console.warn('No teams found for alliance:', alliance);
      return;
    }

    const rescoutState = {
      isRescout: true,
      matchNumber: match.matchNumber,
      alliance: alliance,
      eventKey: match.eventKey,
      teams: teams,
      currentTeamIndex: 0
    };

    navigate('/game-start', {
      state: {
        rescout: rescoutState
      }
    });
  };

  // Get severity badge variant
  const getSeverityVariant = (severity: Discrepancy['severity']) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'warning':
        return 'default';
      case 'minor':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  // Sort all discrepancies by severity
  const allDiscrepancies = [
    ...match.redAlliance.discrepancies.map(d => ({ ...d, alliance: 'red' as const })),
    ...match.blueAlliance.discrepancies.map(d => ({ ...d, alliance: 'blue' as const }))
  ].sort((a, b) => {
    // Sort by severity (critical > warning > minor)
    const severityOrder = { critical: 0, warning: 1, minor: 2, none: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto p-4">
        <SheetHeader className='pt-4 px-0 pb-0'>
          <SheetTitle className="flex items-center gap-3 justify-between py-4">
            <div className="flex items-center gap-3">
              <span>{matchLabel}</span>
              <StatusBadge status={match.status} />
            </div>
            <div className="flex items-center gap-2">
              {getTBAMatchUrl() && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.open(getTBAMatchUrl()!, '_blank')}
                  className='p-4'
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View in TBA
                </Button>
              )}
              {onReValidate && (
                <Button variant="outline" size="sm" onClick={onReValidate} className='p-4'>
                  <RefreshCw className="h-4 w-4" />
                  Re-validate
                </Button>
              )}
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          {/* Match Summary */}
          <MatchSummaryCard match={match} />

          {/* Alliance Comparison */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Alliance Comparison
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AllianceCard 
                allianceValidation={match.redAlliance}
                onRescoutAlliance={handleRescoutAlliance}
              />
              <AllianceCard 
                allianceValidation={match.blueAlliance}
                onRescoutAlliance={handleRescoutAlliance}
              />
            </div>
          </div>

          {/* Detailed Discrepancies */}
          <DiscrepancyList 
            discrepancies={allDiscrepancies}
            getSeverityVariant={getSeverityVariant}
          />

          {/* Team Breakdown */}
          <TeamBreakdown 
            teams={match.teams || []}
            onRescoutTeam={handleRescoutTeam}
          />

          {/* Metadata */}
          <div className="text-xs text-muted-foreground text-center pb-4">
            Validated: {new Date(match.validatedAt).toLocaleString()}
            {match.validatedBy && ` • By: ${match.validatedBy}`}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
