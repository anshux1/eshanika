"use client";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@eshanika/ui/components/field";
import { Input } from "@eshanika/ui/components/input";
import { useState } from "react";
import {
  type FieldValues,
  type Path,
  type PathValue,
  type UseFormReturn,
  useController,
} from "react-hook-form";
import { slugify } from "@/lib/format";

type NameSlug = FieldValues & { name: string; slug: string };

// The slug follows the name until someone edits it by hand.
export function NameSlugFields<T extends NameSlug>({
  form,
  idPrefix,
  namePlaceholder,
}: {
  form: UseFormReturn<T>;
  idPrefix: string;
  namePlaceholder?: string;
}) {
  const name = useController({
    control: form.control,
    name: "name" as Path<T>,
  });
  const slug = useController({
    control: form.control,
    name: "slug" as Path<T>,
  });
  const [slugTouched, setSlugTouched] = useState(
    () =>
      slug.field.value !== "" && slug.field.value !== slugify(name.field.value),
  );

  return (
    <>
      <Field data-invalid={!!name.fieldState.error}>
        <FieldLabel htmlFor={`${idPrefix}-name`}>Name</FieldLabel>
        <Input
          aria-invalid={!!name.fieldState.error}
          id={`${idPrefix}-name`}
          name={name.field.name}
          onBlur={name.field.onBlur}
          onChange={(event) => {
            name.field.onChange(event.target.value);
            if (!slugTouched) {
              form.setValue(
                "slug" as Path<T>,
                slugify(event.target.value) as PathValue<T, Path<T>>,
                { shouldDirty: true },
              );
            }
          }}
          placeholder={namePlaceholder}
          ref={name.field.ref}
          value={name.field.value}
        />
        <FieldError errors={[name.fieldState.error]} />
      </Field>
      <Field data-invalid={!!slug.fieldState.error}>
        <FieldLabel htmlFor={`${idPrefix}-slug`}>Slug</FieldLabel>
        <Input
          aria-invalid={!!slug.fieldState.error}
          className="font-mono text-[0.8rem]"
          id={`${idPrefix}-slug`}
          name={slug.field.name}
          onBlur={slug.field.onBlur}
          onChange={(event) => {
            setSlugTouched(true);
            slug.field.onChange(event.target.value);
          }}
          ref={slug.field.ref}
          value={slug.field.value}
        />
        {slug.fieldState.error ? (
          <FieldError errors={[slug.fieldState.error]} />
        ) : (
          <FieldDescription>Used in store links.</FieldDescription>
        )}
      </Field>
    </>
  );
}
