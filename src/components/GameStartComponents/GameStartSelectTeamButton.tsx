
import { cn } from "@/lib/utils";
import Button from "../ui/button";

interface InitialSelectTeamButtonProps {
  currentTeamType: string;
  currentTeamStatus: boolean;
  clickTeam: (teamType: string, teamStatus: boolean) => void;
  teamName?: string;
  isPreferred?: boolean;
}

const InitialSelectTeamButton = ({
  currentTeamType,
  currentTeamStatus,
  clickTeam,
  teamName = "0000 - Team Name",
  isPreferred = false,
}: InitialSelectTeamButtonProps) => {
  return (
    <>
      <Button
        variant="outline"
        type="button"
        className={cn(
          "w-full h-full flex flex-row items-center text-xl pl-2 active:bg-accent",
          isPreferred && "ring-2 ring-blue-500 ring-offset-2",
          currentTeamStatus && "bg-gray-200 dark:bg-neutral-600",
        )}
        onClick={() => clickTeam(currentTeamType, currentTeamStatus)}
      >
        <div className="flex items-center justify-between w-full">
          <span>{teamName}</span>
          {isPreferred && (
            <span className="text-blue-500 text-sm font-semibold px-2">
              (Your Position)
            </span>
          )}
        </div>
      </Button>
    </>
  );
};

export default InitialSelectTeamButton;
