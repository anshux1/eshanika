"use client";

import type { AdminRole } from "@eshanika/database/enums";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@eshanika/ui/components/field";
import {
  RadioGroup,
  RadioGroupItem,
} from "@eshanika/ui/components/radio-group";
import { ROLE_OPTIONS } from "./role-labels";

export function RolePicker({
  value,
  onChange,
}: {
  value: AdminRole;
  onChange: (role: AdminRole) => void;
}) {
  return (
    <RadioGroup
      aria-label="Role"
      onValueChange={(next) => onChange(next as AdminRole)}
      value={value}
    >
      {ROLE_OPTIONS.map((option) => (
        <FieldLabel htmlFor={`role-${option.value}`} key={option.value}>
          <Field orientation="horizontal">
            <FieldContent>
              <FieldTitle>{option.label}</FieldTitle>
              <FieldDescription>{option.description}</FieldDescription>
            </FieldContent>
            <RadioGroupItem id={`role-${option.value}`} value={option.value} />
          </Field>
        </FieldLabel>
      ))}
    </RadioGroup>
  );
}
