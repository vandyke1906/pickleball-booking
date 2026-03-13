import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface DataTableTagsCellProps {
  value: string[];
  variant?: "default" | "overflow";
  className?: string;
}

export function DataTableTagsCell({
  value,
  variant = "default",
  className,
}: DataTableTagsCellProps) {
  if (!value || value.length === 0) return null;

  if (variant === "overflow") {
    // Show max 2-3 tags, then count
    const MAX_TAGS = 2;
    const visibleTags = value.slice(0, MAX_TAGS);
    const hiddenCount = value.length - MAX_TAGS;

    return (
      <div className={cn("flex items-center gap-1", className)}>
        {visibleTags.map((tag) => (
          <Badge key={tag} variant="secondary" className="rounded-md">
            {tag}
          </Badge>
        ))}
        {hiddenCount > 0 && (
          <Badge variant="outline" className="rounded-md">
            +{hiddenCount}
          </Badge>
        )}
      </div>
    );
  }

  // Default: Wrap
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {value.map((tag) => (
        <Badge key={tag} variant="secondary" className="rounded-md">
          {tag}
        </Badge>
      ))}
    </div>
  );
}
