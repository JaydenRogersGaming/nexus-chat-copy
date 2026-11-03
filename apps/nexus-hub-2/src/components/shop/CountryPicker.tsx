import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { COUNTRIES, setCountry } from '../../lib/holidays';

/** Lets the user choose which country's national days appear in the shop. */
export default function CountryPicker({ country }: { country: string }) {
  return (
    <Select value={country || undefined} onValueChange={setCountry}>
      <SelectTrigger className="h-8 w-48 text-xs bg-black/40 border-white/20 text-white"><SelectValue placeholder="🌍 Pick your country" /></SelectTrigger>
      <SelectContent>
        {Object.entries(COUNTRIES).map(([code, label]) => <SelectItem key={code} value={code}>{label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
