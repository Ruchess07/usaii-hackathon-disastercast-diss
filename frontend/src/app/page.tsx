"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CitySelector } from "@/components/city-selector";

export default function Home() {
  const router = useRouter();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  const handleSelect = (slug: string) => {
    setSelectedSlug(slug);
    router.push(`/dashboard?city=${slug}`);
  };

  return (
    <div className="max-w-2xl mx-auto pt-8 md:pt-16">
      <CitySelector onSelect={handleSelect} />
    </div>
  );
}
