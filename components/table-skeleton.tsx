import { TableCell, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
}

export default function TableSkeleton({ rows = 5, cols = 4 }: TableSkeletonProps) {
  return (
    <>
      {[...Array(rows)].map((_, rowIndex) => (
        <TableRow key={rowIndex}>
          {[...Array(cols)].map((_, colIndex) => (
            <TableCell key={colIndex}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}