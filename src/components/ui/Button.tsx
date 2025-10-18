/**
 * Reusable Button component
 */

import React from 'react';
import { Button as AntButton, ButtonProps as AntButtonProps } from 'antd';

interface ButtonProps extends Omit<AntButtonProps, 'type'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  children,
  className = '',
  ...props
}) => {
  const getVariantProps = () => {
    switch (variant) {
      case 'primary':
        return { type: 'primary' as const };
      case 'secondary':
        return { type: 'default' as const };
      case 'outline':
        return { type: 'default' as const, ghost: true };
      case 'ghost':
        return { type: 'text' as const };
      case 'danger':
        return { type: 'primary' as const, danger: true };
      default:
        return { type: 'primary' as const };
    }
  };

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

  return (
    <AntButton
      {...getVariantProps()}
      {...getSizeProps()}
      loading={loading}
      disabled={disabled}
      className={`custom-button ${className}`}
      {...props}
    >
      {children}
    </AntButton>
  );
};
