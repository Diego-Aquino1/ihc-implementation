import React from "react";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "outline" | "subtle";
};

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = "", 
  variant = "default",
  ...rest 
}) => {
  const variants = {
    default: "rounded-lg border border-neutral-200 bg-white shadow-sm",
    outline: "rounded-lg border-2 border-neutral-300 bg-white",
    subtle: "rounded-lg border border-neutral-100 bg-neutral-50",
  };
  
  return (
    <div
      className={`p-6 ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "sm" | "md" | "lg";
};

export const Button: React.FC<ButtonProps> = ({
  children,
  className = "",
  variant = "default",
  size = "md",
  ...rest
}) => {
  const base = "inline-flex items-center justify-center rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
  
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };
  
  const variants: Record<string, string> = {
    default: "bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 shadow-sm",
    outline: "border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50 active:bg-neutral-100",
    ghost: "text-neutral-700 hover:bg-neutral-100 active:bg-neutral-200",
    secondary: "bg-neutral-100 text-neutral-900 hover:bg-neutral-200 active:bg-neutral-300",
  };
  
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
};

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: boolean;
};

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = "", error = false, ...rest }, ref) => {
    const errorStyles = error 
      ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500" 
      : "border-neutral-300 focus:border-indigo-500 focus:ring-indigo-500";
      
    return (
      <textarea
        ref={ref}
        className={`block w-full rounded-lg border px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 ${errorStyles} ${className}`}
        {...rest}
      />
    );
  }
);

Textarea.displayName = "Textarea";

type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

export const Label: React.FC<LabelProps> = ({ className = "", ...rest }) => (
  <label
    className={`block text-sm font-semibold text-neutral-900 ${className}`}
    {...rest}
  />
);

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "success" | "warning" | "danger" | "info";
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "default",
  className = "",
  ...rest
}) => {
  const variants: Record<string, string> = {
    default: "bg-neutral-100 text-neutral-800",
    success: "bg-emerald-100 text-emerald-800",
    warning: "bg-amber-100 text-amber-800",
    danger: "bg-rose-100 text-rose-800",
    info: "bg-blue-100 text-blue-800",
  };
  
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </span>
  );
};

type RadioProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Radio: React.FC<RadioProps> = ({ className = "", ...rest }) => (
  <input
    type="radio"
    className={`h-4 w-4 rounded-full border-neutral-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${className}`}
    {...rest}
  />
);

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  error?: boolean;
};

export const Select: React.FC<SelectProps> = ({
  className = "",
  error = false,
  ...rest
}) => {
  const errorStyles = error 
    ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500" 
    : "border-neutral-300 focus:border-indigo-500 focus:ring-indigo-500";
    
  return (
    <select
      className={`block w-full rounded-lg border px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 ${errorStyles} ${className}`}
      {...rest}
    />
  );
};

type AlertProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "success" | "warning" | "danger" | "info";
};

export const Alert: React.FC<AlertProps> = ({
  children,
  variant = "default",
  className = "",
  ...rest
}) => {
  const variants: Record<string, string> = {
    default: "bg-neutral-50 border-neutral-200 text-neutral-900",
    success: "bg-emerald-50 border-emerald-200 text-emerald-900",
    warning: "bg-amber-50 border-amber-200 text-amber-900",
    danger: "bg-rose-50 border-rose-200 text-rose-900",
    info: "bg-blue-50 border-blue-200 text-blue-900",
  };
  
  return (
    <div
      className={`rounded-lg border p-4 ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};
