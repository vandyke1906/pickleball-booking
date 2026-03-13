import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DataTableDateCellProps {
  value: Date | string | null | undefined;
}

export function DataTableDateCell({ value }: DataTableDateCellProps) {
  if (!value) return <span className="text-muted-foreground">—</span>;

  const date = new Date(value);
  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const fullDate = new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(date);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="truncate font-medium">{formattedDate}</span>
      </TooltipTrigger>
      <TooltipContent>
        <p>{fullDate}</p>
      </TooltipContent>
    </Tooltip>
  );
}
