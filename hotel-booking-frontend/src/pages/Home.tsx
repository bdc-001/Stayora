import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import "./plan-trip.css";
import { useQuery } from "react-query";
import * as apiClient from "../api-client";
import LatestDestinationCard from "../components/LastestDestinationCard";
import Hero from "../components/Hero";
import PageContainer from "../components/PageContainer";
import { StaggerItem, StaggerScope } from "../components/ui/stagger";
import { isProductHotel } from "../lib/product-hotels";

const Home = () => {
  const { data: hotels, isLoading } = useQuery(
    "fetchQuery",
    () => apiClient.fetchHotels(),
    {
      retry: false,
      staleTime: 30_000,
    },
  );

  const handleSearch = (_searchData: unknown) => {
    // Search is handled by Hero → SearchContext / navigation
  };

  const listed = (hotels || []).filter(isProductHotel);
  const hasHotels = listed.length > 0;

  return (
    <>
      <Hero onSearch={handleSearch} />

      <PageContainer className="py-6">
        <section className="trip-home-entry">
          <div>
            <span className="trip-eyebrow">MEET YOUR TRAVEL COMPANION</span>
            <h2>Your next chapter, planned together.</h2>
            <p>
              Tell our agent your travel dreams. Review the itinerary. Book on
              your terms.
            </p>
          </div>
          <Link to="/plan-trip">
            Plan my trip <ArrowRight size={17} />
          </Link>
        </section>
        <StaggerScope resetKey={hasHotels ? "home-hotels" : "home-empty"}>
          <StaggerItem index={0} className="text-center mb-6">
            <h2 className="text-lg md:text-2xl font-medium text-gray-700">
              Latest Destinations
            </h2>
            <p className="text-sm md:text-lg text-gray-600 font-normal">
              Stays across India & the subcontinent
            </p>
          </StaggerItem>

          {hasHotels ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {listed.map((hotel, i) => (
                <StaggerItem key={hotel._id} index={1 + Math.min(i, 8)}>
                  <LatestDestinationCard hotel={hotel} />
                </StaggerItem>
              ))}
            </div>
          ) : (
            <StaggerItem index={1} className="text-center py-12 text-gray-500">
              {isLoading
                ? "Loading stays…"
                : "No stays to show yet. Check back soon."}
            </StaggerItem>
          )}
        </StaggerScope>
      </PageContainer>
    </>
  );
};

export default Home;
