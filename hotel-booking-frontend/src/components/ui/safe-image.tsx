import {
  useCallback,
  useEffect,
  useState,
  type ImgHTMLAttributes,
  type SyntheticEvent,
} from "react";
import { cn } from "../../lib/utils";

export type SafeImageProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "src" | "alt" | "onError"
> & {
  src?: string | null;
  alt: string;
  /** Absolute fill of a positioned parent (parent must be relative + sized) */
  fill?: boolean;
  /** Prefer eager load for above-the-fold heroes */
  priority?: boolean;
  /** Optional second real photo URL if primary fails (no random/generated images) */
  fallbackSrc?: string | null;
  onError?: (e: SyntheticEvent<HTMLImageElement, Event>) => void;
};

/**
 * Native <img> that only shows real photo URLs (hotel inventory / curated places).
 * No Picsum, faker, or generative fallbacks.
 */
export function SafeImage({
  src,
  alt,
  className,
  fill,
  width,
  height,
  sizes,
  priority,
  loading,
  fallbackSrc,
  onError,
  ...rest
}: SafeImageProps) {
  const primary = typeof src === "string" && src.trim() ? src.trim() : "";
  const secondary =
    typeof fallbackSrc === "string" && fallbackSrc.trim()
      ? fallbackSrc.trim()
      : "";
  const [failedPrimary, setFailedPrimary] = useState(false);
  const [failedAll, setFailedAll] = useState(false);

  useEffect(() => {
    setFailedPrimary(false);
    setFailedAll(false);
  }, [primary, secondary]);

  const displaySrc =
    !failedPrimary && primary
      ? primary
      : secondary && !failedAll
        ? secondary
        : "";

  const eager = Boolean(priority || loading === "eager");

  const handleError = useCallback(
    (e: SyntheticEvent<HTMLImageElement, Event>) => {
      onError?.(e);
      if (!failedPrimary && primary) {
        setFailedPrimary(true);
        if (!secondary) setFailedAll(true);
        return;
      }
      setFailedAll(true);
    },
    [failedPrimary, onError, primary, secondary],
  );

  if (!displaySrc || failedAll) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn(
          "bg-gradient-to-br from-stone-200 to-stone-300",
          fill && "absolute inset-0 h-full w-full",
          className,
        )}
        style={
          !fill && (width || height)
            ? { width: width || undefined, height: height || undefined }
            : undefined
        }
      />
    );
  }

  return (
    <img
      src={displaySrc}
      alt={alt}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      sizes={sizes}
      loading={eager ? "eager" : loading ?? "lazy"}
      decoding="async"
      onError={handleError}
      className={cn(fill && "absolute inset-0 h-full w-full", className)}
      {...rest}
    />
  );
}

export default SafeImage;
