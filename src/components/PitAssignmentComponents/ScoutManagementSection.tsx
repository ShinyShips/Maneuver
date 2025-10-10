import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, Users, UserPlus, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useScoutManagement } from '@/hooks/useScoutManagement';
import { toast } from "sonner";

export const ScoutManagementSection: React.FC = () => {
  const { scoutsList, saveScout, removeScout } = useScoutManagement();
  const [newScoutName, setNewScoutName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddScout = async () => {
    if (!newScoutName.trim()) {
      toast.error('Please enter a scout name');
      return;
    }

    if (scoutsList.includes(newScoutName.trim())) {
      toast.error('Scout already exists');
      return;
    }

    setIsAdding(true);
    try {
      await saveScout(newScoutName.trim());
      setNewScoutName('');
      toast.success(`Added scout: ${newScoutName.trim()}`);
    } catch (error) {
      console.error('Error adding scout:', error);
      toast.error('Failed to add scout');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveScout = async (scoutName: string) => {
    try {
      await removeScout(scoutName);
      toast.success(`Removed scout: ${scoutName}`);
    } catch (error) {
      console.error('Error removing scout:', error);
      toast.error('Failed to remove scout');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddScout();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Scout Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Add New Scout */}
          <div className="flex gap-2">
            <Input
              placeholder="Enter scout name or initials..."
              value={newScoutName}
              onChange={(e) => setNewScoutName(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button 
              onClick={handleAddScout}
              disabled={isAdding || !newScoutName.trim()}
              className="flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Add
            </Button>
          </div>

          {/* Current Scouts List */}
          {scoutsList.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No scouts added yet. Add scouts above to create pit assignments.
                <br />
                <span className="text-xs text-muted-foreground mt-1 block">
                  Since pit scouting happens before competition, you can add temporary names/initials here.
                </span>
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2">
              <div className="text-sm font-medium">
                Available Scouts ({scoutsList.length}):
              </div>
              <div className="flex flex-wrap gap-2">
                {scoutsList.map((scout) => (
                  <div
                    key={scout}
                    className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 border"
                  >
                    <span className="text-sm font-medium">{scout}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveScout(scout)}
                      className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {scoutsList.length > 0 && (
            <div className="text-xs text-muted-foreground">
              💡 Tip: Teams will be divided into blocks among scouts. More scouts = smaller blocks per person.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
