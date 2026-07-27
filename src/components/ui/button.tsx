import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Loader2Icon } from "lucide-react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-gray-950 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 dark:focus-visible:ring-gray-300",
  {
    variants: {
      variant: {
        default:
          "bg-primary-500 text-gray-50 shadow-xs hover:bg-primary-500/90 dark:bg-primary-900 dark:text-gray-50 dark:hover:bg-primary-900/90",
        destructive:
          "bg-red-500 text-gray-50 shadow-xs hover:bg-red-500/90 dark:bg-red-900 dark:text-gray-50 dark:hover:bg-red-900/90",
        primary:
          "bg-primary-700 text-white shadow-sm hover:bg-primary-700/90 dark:bg-primary-100 dark:text-primary-900 dark:hover:bg-primary-100/90",
        primary_gradient:
          "text-white border border-primary-900 rounded-lg relative overflow-hidden bg-linear-to-b from-primary-700 to-primary-800 hover:from-primary-800 hover:to-primary-900 shadow-lg",
        outline:
          "border border-gray-200 bg-white shadow-xs hover:bg-gray-100 hover:text-gray-900 dark:border-gray-800 dark:bg-gray-950 dark:hover:bg-gray-800 dark:hover:text-gray-50",
        secondary:
          "bg-gray-100 text-gray-900 shadow-xs hover:bg-gray-100/80 dark:bg-gray-800 dark:text-gray-50 dark:hover:bg-gray-800/80",
        ghost:
          "hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-50",
        link: "text-gray-900 underline-offset-4 hover:underline dark:text-gray-50",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, loading = false, ...props },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={loading || props.disabled}
        {...props}
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2Icon className="animate-spin" />
            {props.children}
          </div>
        ) : (
          props.children
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export type ButtonWithTimerProps = ButtonProps & {
  initialInterval?: number;
  interval?: number;
};

const ButtonWithTimer = ({
  initialInterval,
  interval = 60,
  ...buttonProps
}: ButtonWithTimerProps) => {
  const [seconds, setSeconds] = React.useState(initialInterval ?? interval);
  const [isButtonDisabled, setIsButtonDisabled] = React.useState(true);

  React.useEffect(() => {
    let interval = undefined;
    if (seconds > 0) {
      interval = setInterval(() => {
        setSeconds((prevSeconds) => prevSeconds - 1);
      }, 1000);
    } else {
      setIsButtonDisabled(false);
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [seconds]);

  return (
    <div>
      <Button
        {...buttonProps}
        disabled={isButtonDisabled}
        onClick={async (e) => {
          await buttonProps.onClick?.(e);
          setSeconds(interval);
          setIsButtonDisabled(true);
        }}
      >
        {!!(seconds && isButtonDisabled) && (
          <div className="mr-2 flex items-center gap-1">
            <Loader2Icon className="animate-spin" />
            <span>{seconds}</span>
          </div>
        )}

        {buttonProps.children}
      </Button>
    </div>
  );
};

export { Button, buttonVariants, ButtonWithTimer };
