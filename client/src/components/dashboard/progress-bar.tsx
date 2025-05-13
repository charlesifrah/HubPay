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
  const percentage = customPercentage || Math.min(Math.round((value / total) * 100), 100);

  return (
    <div className={className}>
      {showLabel && (label || percentage) && (
        <div className="flex justify-between mb-1">
          {label && <span className="text-base font-medium text-gray-700">{label}</span>}
          <span className="text-sm font-medium text-primary-600">{percentage}%</span>
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full ${height}`}>
        <div
          className={`bg-primary-600 ${height} rounded-full`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}
