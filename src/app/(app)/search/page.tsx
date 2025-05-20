
'use client';

import { SearchIcon } from 'lucide-react';

export default function SearchPage() {
  return (
    <div className="container mx-auto py-8">
      <header className="mb-8 text-center">
        <SearchIcon className="mx-auto h-16 w-16 text-accent mb-4" />
        <h1 className="text-4xl font-bold tracking-tight text-foreground">Search Stations</h1>
        <p className="text-lg text-muted-foreground mt-2">
          Find your favorite radio stations quickly.
        </p>
      </header>
      
      <div className="max-w-xl mx-auto">
        {/* Placeholder for search input and results */}
        <div className="bg-card p-8 rounded-lg shadow-xl text-center">
          <p className="text-muted-foreground">
            Search functionality will be implemented here. You'll be able to search
            by station name, genre, country, and more.
          </p>
        </div>
      </div>
    </div>
  );
}
