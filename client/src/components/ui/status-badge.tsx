import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  status: 'pending' | 'approved' | 'rejected' | 'paid' | 'contract' | 'invoice' | 'new' | 'renewal' | 'upsell' | 'pilot' | 'multi-year';
  className?: string;
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusStyles = {
    // Commission statuses
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    paid: "bg-green-100 text-green-800",
    
    // Document types
    contract: "bg-green-100 text-green-800",
    invoice: "bg-blue-100 text-blue-800",
    
    // Contract types
    new: "bg-green-100 text-green-800",
    renewal: "bg-purple-100 text-purple-800",
    upsell: "bg-blue-100 text-blue-800",
    pilot: "bg-blue-100 text-blue-800",
    "multi-year": "bg-purple-100 text-purple-800"
  };

  const statusText = {
    // Title case or specific display text for each status
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    paid: "Paid",
    contract: "Contract",
    invoice: "Invoice",
    new: "New",
    renewal: "Renewal",
    upsell: "Upsell",
    pilot: "Pilot",
    "multi-year": "Multi-Year"
  };

  return (
    <span className={cn(
      "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
      statusStyles[status],
      className
    )}>
      {statusText[status]}
    </span>
  );
}
