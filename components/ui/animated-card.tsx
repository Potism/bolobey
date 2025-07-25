"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  whileHover?: boolean;
  whileTap?: boolean;
}

export function AnimatedCard({
  children,
  className,
  delay = 0,
  whileHover = true,
  whileTap = true,
}: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.6,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      whileHover={
        whileHover
          ? {
              y: -8,
              transition: {
                duration: 0.3,
                ease: "easeOut",
              },
            }
          : {}
      }
      whileTap={
        whileTap
          ? {
              scale: 0.98,
              transition: {
                duration: 0.1,
              },
            }
          : {}
      }
      className={cn(
        "bg-card border border-border/50 rounded-2xl p-6 shadow-lg backdrop-blur-sm",
        "hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-black/20",
        "transition-all duration-300 ease-out",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
