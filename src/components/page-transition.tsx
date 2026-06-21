import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";

export interface PageTransitionProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
}

export function PageTransition({ children, className, ...props }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1], // Custom cubic bezier curve for a premium smooth look
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
