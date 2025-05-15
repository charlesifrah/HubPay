interface ProgressBarProps {
  value: number;
  total?: number;
  label?: string;
  percentage?: number;
  showLabel?: boolean;
  height?: string;
  className?: string;
}

export function ProgressBar({
  value,
  total = 100,
  label,
  percentage: customPercentage,
  showLabel = true,
  height = "h-4",
  className = ""
}: ProgressBarProps) {
  // Calculate the percentage, ensuring it's between 0 and 100 for display purposes
  const calculatedPercentage = customPercentage !== undefined 
    ? customPercentage
    : (value / total) * 100;
    
  // For display in the UI, we format to 2 decimal places
  const displayPercentage = parseFloat(calculatedPercentage.toFixed(2));
    
  // For the actual width in CSS, we use the raw percentage but capped at 100%
  const widthPercentage = Math.min(calculatedPercentage, 100);

  return (
    <div className={className}>
      {showLabel && (label || displayPercentage) && (
        <div className="flex justify-between mb-1">
          {label && <span className="text-base font-medium text-gray-700">{label}</span>}
          <span className="text-sm font-medium text-primary-600">{displayPercentage}%</span>
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full ${height}`}>
        <div
          className={`bg-primary-600 ${height} rounded-full`}
          style={{ width: `${widthPercentage}%` }}
        ></div>
      </div>
    </div>
  );
}
