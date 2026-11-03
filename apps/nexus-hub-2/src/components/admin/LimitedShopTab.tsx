import { useOwnerLimited } from '../../hooks/useOwnerLimited';
import OwnerLimitedEditor from '../shop/OwnerLimitedEditor';

/** Owner panel: create limited titles, typing effects, songs and backgrounds for any holiday. */
export default function LimitedShopTab() {
  const { items, mutate } = useOwnerLimited();
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Make your own limited items and choose which holiday's shop they appear in.</p>
      <OwnerLimitedEditor items={items} mutate={mutate} />
    </div>
  );
}
