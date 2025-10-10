import { type ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ColumnFilterPopover } from "./ColumnFilterPopover";

type FilterOperator = ">" | ">=" | "<" | "<=" | "=" | "!=";

interface ColumnFilter {
  operator: FilterOperator;
  value: number;
}

export interface TeamData {
  teamNumber: number;
  eventName: string;
  matchCount: number;
  [key: string]: string | number;
}

interface ColumnConfig {
  key: string;
  label: string;
  category: string;
  visible: boolean;
  numeric: boolean;
  percentage?: boolean;
}

export const createColumns = (
  columnConfig: ColumnConfig[],
  columnFilters: Record<string, ColumnFilter>,
  onSetColumnFilter: (columnKey: string, operator: FilterOperator, value: number) => void,
  onRemoveColumnFilter: (columnKey: string) => void
): ColumnDef<TeamData>[] => {
  return columnConfig
    .filter(col => col.visible)
    .map((col): ColumnDef<TeamData> => ({
      accessorKey: col.key,
      header: ({ column }) => {
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="h-auto p-0 font-semibold hover:bg-transparent"
            >
              {col.label}
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
            {(col.numeric || col.percentage) && (
              <ColumnFilterPopover
                column={col}
                currentFilter={columnFilters[col.key]}
                onApplyFilter={(operator, value) => onSetColumnFilter(col.key, operator, value)}
                onRemoveFilter={() => onRemoveColumnFilter(col.key)}
              />
            )}
          </div>
        );
      },
      cell: ({ row }) => {
        const value = row.getValue(col.key);
        
        if (col.key === "teamNumber") {
          return (
            <span className="font-medium">
              {typeof value === 'number' ? value : Number(value) || 0}
            </span>
          );
        }
        
        if (col.key === "eventName") {
          return (
            <Badge variant="secondary">
              {String(value)}
            </Badge>
          );
        }
        
        if (col.numeric) {
          return typeof value === 'number' ? value.toFixed(1) : '0.0';
        }
        
        // Percentage columns
        return `${typeof value === 'number' ? Math.round(value) : 0}%`;
      },
      filterFn: col.key === "teamNumber" 
        ? (row, columnId, filterValue) => {
            const value = row.getValue(columnId);
            const teamNumber = String(value);
            const searchValue = String(filterValue).toLowerCase();
            return teamNumber.includes(searchValue);
          }
        : undefined,
      enableSorting: true,
      enableHiding: true,
    }));
};
