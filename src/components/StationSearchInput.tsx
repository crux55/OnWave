'use client';

import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import type React from 'react';

interface StationSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function StationSearchInput({
  value,
  onChange,
  placeholder = "Search stations by name, genre, country...",
  className,
}: StationSearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
      <Input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        className="pl-10 pr-4 py-2 h-12 text-base rounded-lg shadow-sm focus-visible:ring-accent"
      />
    </div>
  );
}
