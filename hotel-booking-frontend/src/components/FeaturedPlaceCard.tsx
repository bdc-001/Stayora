import { Link } from "react-router-dom";
import { MapPin, Plane } from "lucide-react";
import { SafeImage } from "./ui/safe-image";
import type { ImageTopic } from "../lib/generated-images";

type Props = {
  name: string;
  country: string;
  topic?: ImageTopic;
};

/** Destination card powered entirely by generated travel imagery (no hotel record). */
const FeaturedPlaceCard = ({ name, country, topic = "city" }: Props) => {
  const searchTo = `/search?destination=${encodeURIComponent(name)}`;

  return (
    <Link
      to={searchTo}
      className="group relative cursor-pointer overflow-hidden rounded-2xl shadow-soft transition-all duration-300 hover:shadow-large bg-white flex flex-col w-full h-[350px] border border-gray-100"
      style={{ minWidth: 320, maxWidth: 500 }}
    >
      <div className="w-full h-full relative">
        <SafeImage
          alt={`${name} travel`}
          fill
          priority
          fallbackSeed={`place-${name}`}
          fallbackPlace={name}
          fallbackTopic={topic}
          className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent" />
        <div className="absolute top-4 left-4">
          <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1.5">
            {topic === "flight" || topic === "airport" ? (
              <Plane className="w-3.5 h-3.5 text-primary-700" />
            ) : (
              <MapPin className="w-3.5 h-3.5 text-primary-700" />
            )}
            <span className="text-xs font-medium text-gray-700">{country}</span>
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 p-6 w-full">
        <h3 className="text-white font-semibold text-xl md:text-2xl tracking-tight group-hover:text-primary-100 transition-colors">
          {name}
        </h3>
        <p className="text-white/85 text-sm mt-1">Explore stays &amp; routes</p>
      </div>
    </Link>
  );
};

export default FeaturedPlaceCard;
