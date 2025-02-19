import { TableCell, TableRow } from "@/components/ui/table"

interface TableEmptyProps {
  text: string;
  colSpan?: number;
}

export function TableEmpty({ text, colSpan = 10 }: TableEmptyProps) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="h-24 text-center">
        <div className="flex flex-col items-center justify-center gap-2">
          <p className="text-lg text-muted-foreground">{text}</p>
        </div>
      </TableCell>
    </TableRow>
  )
}
