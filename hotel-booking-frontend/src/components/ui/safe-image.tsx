import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ImgHTMLAttributes,
  type SyntheticEvent,
} from "react";
import { cn } from "../../lib/utils";
import {
  generatedImageUrl,
  picsumImageUrl,
  type ImageTopic,
} from "../../lib/generated-images";

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
  /** Seed for generated fallback (hotel id / city name) */
  fallbackSeed?: string;
  /** Place/city label baked into the generative prompt */
  fallbackPlace?: string;
  /** Travel theme for generative fallback */
  fallbackTopic?: ImageTopic;
  /** Override primary fallback URL (defaults to generative place image) */
  fallbackSrc?: string;
  onError?: (e: SyntheticEvent<HTMLImageElement, Event>) => void;
};

type LoadStage = "primary" | "generated" | "picsum";

/**
 * Vite SPA SafeImage — native <img> with generative place/travel fallbacks
 * (@faker-js/faker seed + Pollinations, then Picsum) instead of a broken icon.
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
  fallbackSeed,
  fallbackPlace,
  fallbackTopic = "hotel",
  fallbackSrc,
  onError,
  ...rest
}: SafeImageProps) {
  const resolvedSrc = typeof src === "string" && src.trim() ? src.trim() : "";
  const [stage, setStage] = useState<LoadStage>(() =>
    resolvedSrc ? "primary" : "generated",
  );

  useEffect(() => {
    setStage(resolvedSrc ? "primary" : "generated");
  }, [resolvedSrc]);

  const seed = fallbackSeed || alt || "stayora";
  const w = typeof width === "number" ? width : 800;
  const h = typeof height === "number" ? height : 600;

  const generated = useMemo(
    () =>
      fallbackSrc?.trim() ||
      generatedImageUrl(seed, {
        width: w,
        height: h,
        topic: fallbackTopic,
        place: fallbackPlace,
      }),
    [fallbackSrc, seed, w, h, fallbackTopic, fallbackPlace],
  );

  const picsum = useMemo(() => picsumImageUrl(seed, w, h), [seed, w, h]);

  const displaySrc =
    stage === "primary" && resolvedSrc
      ? resolvedSrc
      : stage === "picsum"
        ? picsum
        : generated;

  const eager = Boolean(priority || loading === "eager");

  const handleError = useCallback(
    (e: SyntheticEvent<HTMLImageElement, Event>) => {
      onError?.(e);
      setStage((s) => {
        if (s === "primary") return "generated";
        if (s === "generated") return "picsum";
        return s;
      });
    },
    [onError],
  );

  return (
    <img
      {...rest}
      alt={alt}
      src={displaySrc}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      sizes={sizes}
      loading={eager ? "eager" : (loading ?? "lazy")}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={handleError}
      className={cn(fill && "absolute inset-0 h-full w-full", className)}
    />
  );
}

export default SafeImage;
