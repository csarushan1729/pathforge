import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium select-none transition-[color,background-color,opacity,transform,box-shadow] duration-quick ease-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-40 active:scale-press",
  {
    variants: {
      variant: {
        primary: "bg-fg text-bg hover:bg-accent",
        secondary: "bg-surface-2 text-fg shadow-border hover:shadow-border-hover",
        ghost: "text-muted hover:text-fg hover:bg-surface-2",
        outline: "text-fg shadow-border hover:bg-surface-2",
      },
      size: {
        sm: "h-9 rounded-sm px-3 text-xs",
        md: "h-10 rounded-sm px-3.5 text-sm",
        lg: "h-11 rounded-md px-4 text-sm",
        icon: "size-10 rounded-sm",
        iconSm: "size-9 rounded-sm",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({ className, variant, size, asChild, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
