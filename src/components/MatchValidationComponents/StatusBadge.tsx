import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, XCircle, Clock, Database } from 'lucide-react';
import type { ValidationStatus } from '@/lib/matchValidationTypes';

interface StatusBadgeProps {
  status: ValidationStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  size = 'md',
  showIcon = true 
}) => {
  const getStatusConfig = (status: ValidationStatus) => {
    switch (status) {
      case 'passed':
        return {
          label: 'Passed',
          className: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400 border-green-200 dark:border-green-800',
          icon: CheckCircle,
        };
      case 'flagged':
        return {
          label: 'Flagged',
          className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
          icon: AlertTriangle,
        };
      case 'failed':
        return {
          label: 'Failed',
          className: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400 border-red-200 dark:border-red-800',
          icon: XCircle,
        };
      case 'pending':
        return {
          label: 'Pending',
          className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700',
          icon: Clock,
        };
      case 'no-tba-data':
        return {
          label: 'No TBA Data',
          className: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400 border-blue-200 dark:border-blue-800',
          icon: Database,
        };
      default:
        return {
          label: 'Unknown',
          className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700',
          icon: Clock,
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };
  
  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <Badge className={`${config.className} ${sizeClasses[size]} font-medium`}>
      {showIcon && <Icon className={`${iconSizes[size]} mr-1`} />}
      {config.label}
    </Badge>
  );
};
