"use client";

import Image from "next/image";
import { useState } from "react";
import NoPhoto from "@/components/NoPhoto";

export { firstImageUrl } from "@/lib/images";

type FillProps = {
  fill: true;
  sizes?: string;
  width?: never;
  height?: never;
};

type FixedProps = {
  fill?: false;
  width: number;
  height: number;
  sizes?: never;
};

type ProductImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
  /** Classes for the NoPhoto placeholder when src is missing/broken */
  fallbackClassName?: string;
} & (FillProps | FixedProps);

/**
 * Product photo with a NoPhoto fallback when the URL is missing or fails to
 * load (deleted Storage object, stale cart snapshot, bad import URL, etc.).
 */
export default function ProductImage(props: ProductImageProps) {
  const { src, alt, className, priority, fallbackClassName } = props;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const trimmed = src?.trim() || "";
  const usable = Boolean(trimmed) && trimmed !== failedSrc;

  if (!usable) {
    return (
      <NoPhoto
        className={
          fallbackClassName ?? (props.fill ? "absolute inset-0" : className ?? "")
        }
      />
    );
  }

  if (props.fill) {
    return (
      <Image
        src={trimmed}
        alt={alt}
        fill
        sizes={props.sizes}
        priority={priority}
        className={className}
        onError={() => setFailedSrc(trimmed)}
      />
    );
  }

  return (
    <Image
      src={trimmed}
      alt={alt}
      width={props.width}
      height={props.height}
      priority={priority}
      className={className}
      onError={() => setFailedSrc(trimmed)}
    />
  );
}
