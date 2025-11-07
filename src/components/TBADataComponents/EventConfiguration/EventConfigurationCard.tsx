import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Calendar,
  Trash2,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

interface EventConfigurationCardProps {
  eventKey: string;
  setEventKey: (key: string) => void;
  hasStoredData: boolean;
  onClearAllData: () => void;
  clearingData: boolean;
}

export const EventConfigurationCard: React.FC<EventConfigurationCardProps> = ({
  eventKey,
  setEventKey,
  hasStoredData,
  onClearAllData,
  clearingData,
}) => {
  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Event Configuration
              </CardTitle>
              <CardDescription>
                Set the event for all data operations. All data will be associated with this event.
              </CardDescription>
            </div>
            {eventKey && (
              <Badge variant="secondary" className="text-sm">
                Event: {eventKey}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Event Key Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Event Key</label>
            <Input
              id="eventKey"
              placeholder="e.g., 2024chcmp, 2024week0"
              value={eventKey}
              onChange={(e) => setEventKey(e.target.value)}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Event keys can be found on The Blue Alliance event pages
            </p>
          </div>

          {/* Current Event Status */}
          {eventKey && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                All data operations will use event: <strong>{eventKey}</strong>
              </AlertDescription>
            </Alert>
          )}

          {/* Stored Data Warning */}
          {hasStoredData && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p>You have stored data for this event. Changing the event key or loading new data may cause confusion.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onClearAllData}
                    disabled={clearingData}
                    className="flex items-center gap-2"
                  >
                    {clearingData ? (
                      <>
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Clearing...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-3 w-3" />
                        Clear All Stored Data
                      </>
                    )}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </>
  );
};
