/**
 * Reusable Input component
 */

import React from 'react';
import { Input as AntInput, InputProps as AntInputProps } from 'antd';

interface InputProps extends Omit<AntInputProps, 'size'> {
  label?: string;
  error?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'outlined' | 'filled' | 'borderless';
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  size = 'medium',
  variant = 'outlined',
  className = '',
  ...props
}) => {
  const getSizeProps = () => {
    switch (size) {
      case 'small':
        return { size: 'small' as const };
      case 'medium':
        return { size: 'middle' as const };
      case 'large':
        return { size: 'large' as const };
      default:
        return { size: 'middle' as const };
    }
  };

  const getVariantProps = () => {
    switch (variant) {
      case 'outlined':
        return { variant: 'outlined' as const };
      case 'filled':
        return { variant: 'filled' as const };
      case 'borderless':
        return { variant: 'borderless' as const };
      default:
        return { variant: 'outlined' as const };
    }
  };

  return (
    <div className="input-wrapper">
      {label && <label className="input-label">{label}</label>}
      <AntInput
        {...getSizeProps()}
        {...getVariantProps()}
        className={`custom-input ${className}`}
        status={error ? 'error' : undefined}
        {...props}
      />
      {error && <span className="input-error">{error}</span>}
    </div>
  );
};
