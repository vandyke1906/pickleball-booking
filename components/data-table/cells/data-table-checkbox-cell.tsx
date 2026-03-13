import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Props {
  name: string;
}

const DataTableUserCell: React.FC<Props> = ({ name }) => {
  return (
    <div className="flex items-center gap-2.5">
      <Avatar>
        <AvatarFallback>{name[0]}</AvatarFallback>
      </Avatar>
      <p className="text-xs">{name}</p>
    </div>
  );
};

export default DataTableUserCell;
