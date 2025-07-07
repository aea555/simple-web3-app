import { AppHero } from "./ui-layout";

type HeroProps = {
  title: string;
  subtitle: string;
};

export default function Hero({title, subtitle}: HeroProps) {
  return (
    <>
      <div className="lg:w-1/2 flex items-center justify-center lg:justify-end lg:pr-8 mb-8 lg:mb-0">
        <AppHero
          className="mb-0" // Ensure no margin at the bottom
          title={title}
          subtitle={subtitle}
        />
      </div>
    </>
  );
}
