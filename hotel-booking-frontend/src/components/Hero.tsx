import AdvancedSearch from "./AdvancedSearch";
import PageContainer from "./PageContainer";
import { StaggerItem } from "./ui/stagger";
import { BRAND_NAME, BRAND_TAGLINE } from "../lib/brand";

/**
 * Landing hero — brand-first composition; search is the interaction surface.
 * Gradient plane stays static; copy + search stagger in.
 */
const Hero = ({ onSearch }: { onSearch: (searchData: unknown) => void }) => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary-800 via-primary-700 to-teal-900">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 60% at 20% 20%, rgba(45,212,191,0.35), transparent), radial-gradient(ellipse 70% 50% at 90% 80%, rgba(15,23,42,0.45), transparent)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:48px_48px]"
        aria-hidden
      />

      <PageContainer className="relative pt-14 pb-10 md:pt-20 md:pb-14">
        <div className="max-w-3xl mx-auto text-center mb-10 md:mb-12">
          <StaggerItem index={0}>
            <p className="text-4xl sm:text-5xl md:text-6xl font-semibold text-white tracking-tight mb-4">
              {BRAND_NAME}
            </p>
          </StaggerItem>

          <StaggerItem index={1}>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-medium text-teal-50/95 mb-4 leading-snug">
              Hotels, resorts, and getaways across India
            </h1>
          </StaggerItem>

          <StaggerItem index={2}>
            <p className="text-base md:text-lg text-teal-100/80 max-w-xl mx-auto leading-relaxed">
              {BRAND_TAGLINE} Search destinations, compare stays, and book with
              secure checkout.
            </p>
          </StaggerItem>
        </div>

        <StaggerItem index={3}>
          <AdvancedSearch onSearch={onSearch} />
        </StaggerItem>
      </PageContainer>
    </section>
  );
};

export default Hero;
