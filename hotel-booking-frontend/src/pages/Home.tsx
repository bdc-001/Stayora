import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import "./plan-trip.css";
import { useQuery } from "react-query";
import * as apiClient from "../api-client";
import LatestDestinationCard from "../components/LastestDestinationCard";
import FeaturedPlaceCard from "../components/FeaturedPlaceCard";
import Hero from "../components/Hero";
import PageContainer from "../components/PageContainer";
import { StaggerItem, StaggerScope } from "../components/ui/stagger";
import { FEATURED_PLACES } from "../lib/generated-images";

const Home = () => {
  const { data: hotels } = useQuery("fetchQuery", () => apiClient.fetchHotels(), {
    retry: false,
    staleTime: 30_000,
  });

  const handleSearch = (_searchData: unknown) => {
    // Search is handled by Hero → SearchContext / navigation
  };

  const hasHotels = Boolean(hotels && hotels.length > 0);

  return (
    <>
      <Hero onSearch={handleSearch} />

      <PageContainer className="py-6">
        <section className="trip-home-entry"><div><span className="trip-eyebrow">MEET YOUR TRAVEL COMPANION</span><h2>Your next chapter, planned together.</h2><p>Tell our agent your travel dreams. Review the itinerary. Book on your terms.</p></div><Link to="/plan-trip">Plan my trip <ArrowRight size={17} /></Link></section>
        <StaggerScope resetKey={hasHotels ? "home-hotels" : "home-featured"}>
          <StaggerItem index={0} className="text-center mb-6">
            <h2 className="text-lg md:text-2xl font-medium text-gray-700">
              {hasHotels ? "Latest Destinations" : "Popular Places"}
            </h2>
            <p className="text-sm md:text-lg text-gray-600 font-normal">
              {hasHotels
                ? "Most recent destinations added by our hosts"
                : "Places, resorts, and flight hubs — photos via @faker-js/faker"}
            </p>
          </StaggerItem>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {hasHotels
              ? hotels!.map((hotel, i) => (
                  <StaggerItem key={hotel._id} index={1 + Math.min(i, 8)}>
                    <LatestDestinationCard hotel={hotel} />
                  </StaggerItem>
                ))
              : FEATURED_PLACES.map((place, i) => (
                  <StaggerItem key={place.name} index={1 + Math.min(i, 8)}>
                    <FeaturedPlaceCard
                      name={place.name}
                      country={place.country}
                      topic={place.topic}
                    />
                  </StaggerItem>
                ))}
          </div>
        </StaggerScope>
      </PageContainer>
    </>
  );
};

export default Home;
