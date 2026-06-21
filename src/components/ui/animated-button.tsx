import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export interface AnimatedButtonProps
  extends Omit<HTMLMotionProps<"button">, "ref">, VariantProps<typeof buttonVariants> {}

const AnimatedButton = React.forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  },
);

AnimatedButton.displayName = "AnimatedButton";

export { AnimatedButton };
