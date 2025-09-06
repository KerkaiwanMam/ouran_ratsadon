// components/GlassButton.tsx
"use client";
import { motion } from "framer-motion";
import Link from "next/link";

interface GlassButtonProps {
  text: string;
  href: string;
}

export default function GlassButton({ text, href }: GlassButtonProps) {
  return (
    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
      <Link href={href}>
        <button className="glass">{text}</button>
      </Link>
    </motion.div>
  );
}
