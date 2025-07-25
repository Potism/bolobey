"use client";

import { motion } from "framer-motion";
import { ReactNode, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface AnimatedButtonProps extends React.ComponentProps<typeof Button> {
  children: ReactNode;
  className?: string;
  delay?: number;
  whileHover?: boolean;
  whileTap?: boolean;
}

export function AnimatedButton({
  children,
  className,
  delay = 0,
  whileHover = true,
  whileTap = true,
  ...props
}: AnimatedButtonProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.4,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      whileHover={
        whileHover && !isMobile
          ? {
              scale: 1.05,
              transition: {
                duration: 0.2,
                ease: "easeOut",
              },
            }
          : {}
      }
      whileTap={
        whileTap
          ? {
              scale: 0.95,
              transition: {
                duration: 0.1,
              },
            }
          : {}
      }
    >
      <Button
        className={cn(
          "relative overflow-hidden transition-all duration-300",
          "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
          "before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700",
          className
        )}
        {...props}
      >
        {children}
      </Button>
    </motion.div>
  );
}
