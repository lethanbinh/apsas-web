import React from 'react';
import { Button as AntButton, ButtonProps as AntButtonProps } from 'antd';

interface ButtonProps extends Omit<AntButtonProps, 'type' | 'size' | 'variant'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'small' | 'middle' | 'large';
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'middle',
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

  const getSizeProps = () => ({ size });

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
