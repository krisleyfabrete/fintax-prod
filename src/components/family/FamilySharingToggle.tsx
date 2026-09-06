import { Users } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface FamilySharingToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  hasFamily?: boolean;
}

export function FamilySharingToggle({
  checked,
  onCheckedChange,
  hasFamily = true,
}: FamilySharingToggleProps) {
  if (!hasFamily) return null;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
      <div className="flex items-center gap-3">
        <Users className="h-4 w-4 text-muted-foreground" />
        <Label htmlFor="family-sharing" className="text-sm cursor-pointer">
          Compartilhar com família
        </Label>
      </div>
      <Switch
        id="family-sharing"
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}
