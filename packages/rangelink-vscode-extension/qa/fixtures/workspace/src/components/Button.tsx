import React from 'react';

interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({ label, onClick, disabled = false }) => {
  return (
    <button type="button" onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
};

export default Button;
