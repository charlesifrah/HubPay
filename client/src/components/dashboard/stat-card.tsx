import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: string | number;
    isPositive: boolean;
  };
  linkText?: string;
  linkHref?: string;
  iconBgColor?: string;
  iconColor?: string;
}

export function StatCard({
  title,
  value,
  icon,
  trend,
  linkText,
  linkHref,
  iconBgColor = 'bg-primary-100',
  iconColor = 'text-primary-600'
}: StatCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center">
          <div className={cn("flex-shrink-0 rounded-md p-3", iconBgColor)}>
            <div className={iconColor}>{icon}</div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-semibold text-gray-900">{value}</div>
                {trend && (
                  <div className={cn(
                    "ml-2 flex items-baseline text-sm font-semibold",
                    trend.isPositive ? "text-green-600" : "text-red-600"
                  )}>
                    {trend.isPositive ? 
                      <ArrowUp className="h-3 w-3 mr-1" /> : 
                      <ArrowDown className="h-3 w-3 mr-1" />
                    }
                    <span className="sr-only">{trend.isPositive ? "Increased by" : "Decreased by"}</span>
                    {trend.value}
                  </div>
                )}
              </dd>
            </dl>
          </div>
        </div>
      </CardContent>
      {linkText && linkHref && (
        <div className="bg-gray-50 px-5 py-3">
          <div className="text-sm">
            <a href={linkHref} className="font-medium text-primary-600 hover:text-primary-500">
              {linkText}
            </a>
          </div>
        </div>
      )}
    </Card>
  );
}
