"use client";

import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@eshanika/ui/components/combobox";
import { Fragment } from "react";

export type MultiSelectItem = { id: string; label: string; hint?: string };

type MultiSelectProps = {
  id?: string;
  items: MultiSelectItem[];
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder: string;
  emptyText: string;
  invalid?: boolean;
};

// Chips input for picking several records, such as categories or options.
export function MultiSelect({
  id,
  items,
  value,
  onChange,
  placeholder,
  emptyText,
  invalid,
}: MultiSelectProps) {
  const anchor = useComboboxAnchor();
  const byId = new Map(items.map((item) => [item.id, item]));
  const selected = value.map(
    (itemId) => byId.get(itemId) ?? { id: itemId, label: "…" },
  );

  return (
    <Combobox
      autoHighlight
      isItemEqualToValue={(item, current) => item.id === current.id}
      itemToStringLabel={(item: MultiSelectItem) => item.label}
      items={items}
      multiple
      onValueChange={(next: MultiSelectItem[]) =>
        onChange(next.map((item) => item.id))
      }
      value={selected}
    >
      <ComboboxChips className="min-h-9 w-full" ref={anchor}>
        <ComboboxValue>
          {(values: MultiSelectItem[]) => (
            <Fragment>
              {values.map((item) => (
                <ComboboxChip key={item.id}>{item.label}</ComboboxChip>
              ))}
              <ComboboxChipsInput
                aria-invalid={invalid}
                id={id}
                placeholder={values.length === 0 ? placeholder : undefined}
              />
            </Fragment>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchor}>
        <ComboboxEmpty>{emptyText}</ComboboxEmpty>
        <ComboboxList>
          {(item: MultiSelectItem) => (
            <ComboboxItem key={item.id} value={item}>
              <span className="truncate">{item.label}</span>
              {item.hint ? (
                <span className="ml-auto truncate text-xs text-muted-foreground">
                  {item.hint}
                </span>
              ) : null}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
