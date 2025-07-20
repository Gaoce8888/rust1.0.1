import React from 'react';
import { TextField, TextFieldProps } from '@mui/material';
import { Controller, Control, FieldValues, Path } from 'react-hook-form';

interface FormInputProps<TFieldValues extends FieldValues = FieldValues>
  extends Omit<TextFieldProps, 'name'> {
  name: Path<TFieldValues>;
  control: Control<TFieldValues>;
  rules?: any;
}

export function FormInput<TFieldValues extends FieldValues = FieldValues>({
  name,
  control,
  rules,
  ...textFieldProps
}: FormInputProps<TFieldValues>) {
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field, fieldState: { error } }) => (
        <TextField
          {...field}
          {...textFieldProps}
          error={!!error}
          helperText={error?.message || textFieldProps.helperText}
          fullWidth
          variant="outlined"
        />
      )}
    />
  );
}

export default FormInput;