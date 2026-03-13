import { Checkbox } from "@/components/ui/checkbox";

interface Props {
  checked?: boolean;
  onCheckedChange?(checked: boolean): void;
}

const DataTableCheckboxCell: React.FC<Props> = ({
  checked,
  onCheckedChange,
}) => {
  return (
    <div className="flex items-center justify-center">
      <Checkbox checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
};

export default DataTableCheckboxCell;
