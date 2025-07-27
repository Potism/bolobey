"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { countries, Country, getCountriesByRegion } from "@/lib/countries";

interface CountrySelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function CountrySelector({
  value,
  onValueChange,
  placeholder = "Select country...",
  className,
}: CountrySelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const selectedCountry = useMemo(() => {
    return countries.find((country) => country.code === value);
  }, [value]);

  const filteredCountries = useMemo(() => {
    if (!searchQuery) return countries;

    return countries.filter(
      (country) =>
        country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        country.code.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const groupedCountries = useMemo(() => {
    const grouped = filteredCountries.reduce((acc, country) => {
      if (!acc[country.region]) {
        acc[country.region] = [];
      }
      acc[country.region].push(country);
      return acc;
    }, {} as Record<string, Country[]>);

    return grouped;
  }, [filteredCountries]);

  return (
    <div className={cn("w-full", className)}>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder}>
            {selectedCountry && (
              <span className="flex items-center gap-2">
                <span className="text-lg">{selectedCountry.flag}</span>
                <span>{selectedCountry.name}</span>
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          <div className="flex items-center border-b px-3 py-2">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              placeholder="Search countries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-0 focus:ring-0 p-0 h-auto"
            />
          </div>
          {Object.entries(groupedCountries).map(([region, countries]) => (
            <SelectGroup key={region}>
              <SelectLabel className="font-semibold text-sm">
                {region}
              </SelectLabel>
              {countries.map((country) => (
                <SelectItem
                  key={country.code}
                  value={country.code}
                  className="flex items-center gap-2"
                >
                  <span className="text-lg">{country.flag}</span>
                  <span className="flex-1">{country.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {country.code}
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// Simple version for forms
export function SimpleCountrySelector({
  value,
  onValueChange,
  placeholder = "Select country...",
  className,
}: CountrySelectorProps) {
  const selectedCountry = useMemo(() => {
    return countries.find((country) => country.code === value);
  }, [value]);

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={cn("w-full", className)}>
        {selectedCountry ? (
          <span className="flex items-center gap-2">
            <span className="text-lg">{selectedCountry.flag}</span>
            <span>{selectedCountry.name}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        {Object.entries(getCountriesByRegion()).map(([region, countries]) => (
          <SelectGroup key={region}>
            <SelectLabel className="font-semibold text-sm">
              {region}
            </SelectLabel>
            {countries.map((country) => (
              <SelectItem
                key={country.code}
                value={country.code}
                className="flex items-center gap-2"
              >
                <span className="text-lg">{country.flag}</span>
                <span>{country.name}</span>
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
