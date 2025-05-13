import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type RecentUpload = {
  id: number;
  type: 'contract' | 'invoice';
  clientName: string;
  aeName: string;
  value: string;
  date: string;
  status: 'processed' | 'pending';
};

interface RecentUploadsTableProps {
  uploads: RecentUpload[];
}

export function RecentUploadsTable({ uploads }: RecentUploadsTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>AE</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Uploaded</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {uploads.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                No recent uploads found
              </TableCell>
            </TableRow>
          ) : (
            uploads.map((upload) => (
              <TableRow key={`${upload.type}-${upload.id}`}>
                <TableCell>
                  <StatusBadge status={upload.type} />
                </TableCell>
                <TableCell>
                  <div className="text-sm text-gray-900">{upload.clientName}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-gray-900">{upload.aeName}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-gray-900">${upload.value}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-gray-900">{upload.date}</div>
                </TableCell>
                <TableCell>
                  <StatusBadge
                    status={upload.status === 'pending' ? 'pending' : 'approved'}
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
