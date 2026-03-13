import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface DataTableBooleanCellProps {
  value: boolean;
  trueText?: string;
  falseText?: string;
}

export function DataTableBooleanCell({
  value,
  trueText = "Yes",
  falseText = "No",
}: DataTableBooleanCellProps) {
  return (
    <Badge
      variant={value ? "default" : "secondary"}
      className={cn(
        "rounded-md font-normal",
        value
          ? "bg-green-500/15 text-green-700 hover:bg-green-500/25 border-green-200"
          : "bg-muted text-muted-foreground hover:bg-muted/80 border-muted-foreground/20"
      )}
    >
      {value ? trueText : falseText}
    </Badge>
  );
}
