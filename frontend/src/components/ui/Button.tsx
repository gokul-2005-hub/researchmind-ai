import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/utils/cn"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-indigo-600 text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/10 active:bg-indigo-700",
        destructive:
          "bg-red-600 text-white hover:bg-red-500 shadow-md shadow-red-600/10 active:bg-red-700",
        outline:
          "border border-slate-200 dark:border-slate-800 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200",
        secondary:
          "bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800",
        ghost:
          "hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white",
        link:
          "text-indigo-500 dark:text-indigo-400 underline-offset-4 hover:underline",
        glass:
          "bg-indigo-950/20 dark:bg-indigo-950/30 backdrop-blur-md border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/10 hover:border-indigo-500/40 shadow-sm",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-2xl px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
