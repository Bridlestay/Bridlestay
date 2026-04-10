"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { UK_COUNTIES } from "@/lib/constants/counties";

export function SearchBar() {
  const router = useRouter();
  const [location, setLocation] = useState<string>("all");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState("2");
  const [horses, setHorses] = useState("1");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (location && location !== "" && location !== "all") params.set("location", location);
    if (checkIn) params.set("checkIn", checkIn);
    if (checkOut) params.set("checkOut", checkOut);
    if (guests) params.set("guests", guests);
    if (horses) params.set("horses", horses);

    router.push(`/search?${params.toString()}`);
  };

  return (
    <form
      onSubmit={handleSearch}
      className="bg-white rounded-lg shadow-lg p-4 grid grid-cols-1 md:grid-cols-5 gap-4"
    >
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          County
        </label>
        <Select defaultValue="all" onValueChange={setLocation}>
          <SelectTrigger className="bg-white text-gray-900">
            <SelectValue className="text-gray-900" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All counties</SelectItem>
            {UK_COUNTIES.map((county) => (
              <SelectItem key={county} value={county}>
                {county}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Check-in
        </label>
        <Input
          type="date"
          value={checkIn}
          onChange={(e) => setCheckIn(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Check-out
        </label>
        <Input
          type="date"
          value={checkOut}
          onChange={(e) => setCheckOut(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Guests
          </label>
          <Input
            type="number"
            min="1"
            value={guests}
            onChange={(e) => setGuests(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Horses
          </label>
          <Input
            type="number"
            min="1"
            value={horses}
            onChange={(e) => setHorses(e.target.value)}
          />
        </div>
      </div>
      <Button
        type="submit"
        className="w-full h-[88px] text-base px-8 self-end"
      >
        <Search className="mr-2 h-5 w-5" />
        Search
      </Button>
    </form>
  );
}


