"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { DeliveryZone } from "@/types";

interface DeliveryZoneSelectProps {
  value: string;
  onChange: (zoneId: string, fee: number) => void;
  zones: DeliveryZone[];
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function DeliveryZoneSelect({
  value,
  onChange,
  zones,
  className,
  placeholder = "اختر منطقة التوصيل",
  disabled,
}: DeliveryZoneSelectProps) {
  return (
    <Select
      value={value || undefined}
      disabled={disabled || zones.length === 0}
      onValueChange={(zoneId) => {
        const zone = zones.find((z) => z.id === zoneId);
        onChange(zoneId, zone?.fee ?? 0);
      }}
    >
      <SelectTrigger className={cn(className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {zones.map((zone) => (
          <SelectItem key={zone.id} value={zone.id}>
            <span className="flex w-full items-center justify-between gap-3">
              <span>
                {zone.name}
                <span className="text-muted-foreground"> · {zone.city}</span>
              </span>
              <span className="tabular-nums text-muted-foreground">
                {zone.fee.toFixed(2)}
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
