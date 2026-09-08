import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { SelectOptionLabel } from "./ui/select-option-label";
import FilterSectionLabel from "./FilterSectionLabel";
import { CircleDashed, IndianRupee } from "lucide-react";
import { formatMoney } from "../lib/currency";

type Props = {
  selectedPrice?: number;
  onChange: (value?: number) => void;
};

const PriceFilter = ({ selectedPrice, onChange }: Props) => {
  return (
    <div>
      <FilterSectionLabel icon={IndianRupee} title="Max Price" />
      <Select
        value={selectedPrice != null ? String(selectedPrice) : "any"}
        onValueChange={(v) =>
          onChange(v === "any" ? undefined : parseInt(v, 10))
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="Select max price" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any">
            <SelectOptionLabel
              icon={CircleDashed}
              iconClassName="text-gray-400"
            >
              Any
            </SelectOptionLabel>
          </SelectItem>
          {[5000, 8000, 10000, 15000, 20000, 30000].map((price) => (
            <SelectItem key={price} value={String(price)}>
              <SelectOptionLabel icon={IndianRupee}>
                {formatMoney(price)}
              </SelectOptionLabel>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default PriceFilter;
