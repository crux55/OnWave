
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { mockStations } from '@/lib/mock-data';
import type { RadioStation } from '@/lib/types';
import { usePlayer } from '@/contexts/PlayerContext';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { StationSearchInput } from '@/components/StationSearchInput';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ListMusic, PlayCircle, ArrowUpDown, ArrowUp, ArrowDown, Search, ChevronsUpDown, CheckIcon, Filter, XIcon } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';


type SortKey = keyof Pick<RadioStation, 'name' | 'genre' | 'country'>;
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

export default function WinampPage() {
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [generalSearchTerm, setGeneralSearchTerm] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>('all'); // 'all', 'followed', 'online'
  const [genrePopoverOpen, setGenrePopoverOpen] = useState(false);

  const player = usePlayer();

  useEffect(() => {
    setStations(mockStations);
  }, []);

  const uniqueGenres = useMemo(() => {
    const genres = new Set<string>();
    stations.forEach(station => genres.add(station.genre));
    return Array.from(genres).sort();
  }, [stations]);

  const filteredAndSortedStations = useMemo(() => {
    let processedStations = [...stations];

    // Apply general text search
    if (generalSearchTerm) {
      processedStations = processedStations.filter(station =>
        station.name.toLowerCase().includes(generalSearchTerm.toLowerCase()) ||
        station.genre.toLowerCase().includes(generalSearchTerm.toLowerCase()) ||
        station.country.toLowerCase().includes(generalSearchTerm.toLowerCase())
      );
    }

    // Apply genre filter
    if (selectedGenres.size > 0) {
      processedStations = processedStations.filter(station =>
        selectedGenres.has(station.genre)
      );
    }

    // Apply status filter (conceptual for now)
    if (statusFilter === 'followed') {
      // Conceptual: filter for followed stations (needs data model update)
      // For now, it might show all or none if no station has a 'followed' property
    } else if (statusFilter === 'online') {
      // Conceptual: filter for online stations (needs real-time data)
    }

    // Apply sort
    if (sortConfig !== null) {
      processedStations.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return processedStations;
  }, [stations, sortConfig, generalSearchTerm, selectedGenres, statusFilter]);

  const requestSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: SortKey) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="ml-2 h-3 w-3 text-muted-foreground/70" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ArrowUp className="ml-2 h-3 w-3 text-accent" />
    ) : (
      <ArrowDown className="ml-2 h-3 w-3 text-accent" />
    );
  };

  const handlePlayStation = (station: RadioStation) => {
    player.playStation(station);
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev => {
      const newSelectedGenres = new Set(prev);
      if (newSelectedGenres.has(genre)) {
        newSelectedGenres.delete(genre);
      } else {
        newSelectedGenres.add(genre);
      }
      return newSelectedGenres;
    });
  };

  const getSelectedGenresText = () => {
    if (selectedGenres.size === 0) return "Filter by Genre";
    if (selectedGenres.size === 1) return `${Array.from(selectedGenres)[0]}`;
    if (selectedGenres.size > 1) return `${selectedGenres.size} genres selected`;
    return "Filter by Genre";
  }

  const clearGenreFilters = () => {
    setSelectedGenres(new Set());
  }


  return (
    <div className="container mx-auto">
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <ListMusic className="h-8 w-8 text-accent" />
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Winamp Stations
          </h1>
        </div>
        <p className="text-md text-muted-foreground">
          Browse, filter, and sort your favorite classic radio stations.
        </p>
      </header>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <StationSearchInput
          value={generalSearchTerm}
          onChange={setGeneralSearchTerm}
          placeholder="Search stations..."
          className="flex-grow"
        />
        <div className="flex gap-2 items-center">
          <Popover open={genrePopoverOpen} onOpenChange={setGenrePopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" aria-expanded={genrePopoverOpen} className="w-full sm:w-[200px] justify-between">
                <span className="truncate">{getSelectedGenresText()}</span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[250px] p-0">
              <Command>
                <CommandInput placeholder="Search genres..." />
                <CommandList>
                  <CommandEmpty>No genre found.</CommandEmpty>
                  <CommandGroup>
                    {uniqueGenres.map((genre) => (
                      <CommandItem
                        key={genre}
                        value={genre}
                        onSelect={() => {
                          toggleGenre(genre);
                        }}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center">
                           <Checkbox
                            id={`genre-${genre}`}
                            checked={selectedGenres.has(genre)}
                            onCheckedChange={() => toggleGenre(genre)}
                            className="mr-2"
                          />
                          <label htmlFor={`genre-${genre}`} className="cursor-pointer flex-grow">{genre}</label>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
                 {selectedGenres.size > 0 && (
                  <div className="p-2 border-t">
                    <Button variant="ghost" size="sm" onClick={clearGenreFilters} className="w-full justify-start text-destructive hover:text-destructive-foreground">
                      <XIcon className="mr-2 h-4 w-4" /> Clear genre filters
                    </Button>
                  </div>
                )}
              </Command>
            </PopoverContent>
          </Popover>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="View" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stations</SelectItem>
              <SelectItem value="followed" disabled>Followed (soon)</SelectItem>
              <SelectItem value="online" disabled>Online (soon)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {selectedGenres.size > 0 && (
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Active genre filters:</span>
          {Array.from(selectedGenres).map(genre => (
            <Badge key={genre} variant="secondary" className="flex items-center gap-1">
              {genre}
              <button onClick={() => toggleGenre(genre)} aria-label={`Remove ${genre} filter`} className="rounded-full hover:bg-muted/50 p-0.5">
                <XIcon className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}


      <Card className="shadow-lg bg-[hsl(0,0%,12%)] border-[hsl(0,0%,20%)]">
        <div className="overflow-hidden rounded-lg">
          <Table>
            <TableHeader>
              <TableRow className="border-b-[hsl(0,0%,25%)] hover:bg-[hsl(0,0%,15%)]">
                <TableHead className="w-[50px] hidden sm:table-cell py-2 px-3 text-xs text-muted-foreground"></TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-[hsl(0,0%,15%)] transition-colors py-2 px-3 text-xs text-muted-foreground h-10"
                  onClick={() => requestSort('name')}
                >
                  <div className="flex items-center text-foreground/90">
                    Name {getSortIcon('name')}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-[hsl(0,0%,15%)] transition-colors py-2 px-3 text-xs text-muted-foreground h-10"
                  onClick={() => requestSort('genre')}
                >
                  <div className="flex items-center text-foreground/90">
                    Genre {getSortIcon('genre')}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-[hsl(0,0%,15%)] transition-colors hidden md:table-cell py-2 px-3 text-xs text-muted-foreground h-10"
                  onClick={() => requestSort('country')}
                >
                  <div className="flex items-center text-foreground/90">
                    Country {getSortIcon('country')}
                  </div>
                </TableHead>
                <TableHead className="text-right py-2 px-3 text-xs text-muted-foreground h-10">
                    <span className="text-foreground/90">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedStations.length > 0 ? (
                filteredAndSortedStations.map((station) => (
                  <TableRow key={station.id} className="border-b-[hsl(0,0%,16%)] hover:bg-[hsl(0,0%,15%)]">
                    <TableCell className="hidden sm:table-cell py-1.5 px-3">
                      <Image
                        src={station.faviconUrl || `https://placehold.co/32x32.png`}
                        alt={`${station.name} logo`}
                        width={30} // Reduced size
                        height={30} // Reduced size
                        className="rounded-sm border border-[hsl(0,0%,25%)]"
                        data-ai-hint="radio logo"
                      />
                    </TableCell>
                    <TableCell className="font-medium text-foreground/90 py-1.5 px-3 text-sm">{station.name}</TableCell>
                    <TableCell className="text-muted-foreground py-1.5 px-3 text-sm">{station.genre}</TableCell>
                    <TableCell className="text-muted-foreground hidden md:table-cell py-1.5 px-3 text-sm">{station.country}</TableCell>
                    <TableCell className="text-right py-1.5 px-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePlayStation(station)}
                        className="text-accent hover:text-accent-foreground hover:bg-accent/90 h-7 px-2" // Reduced height
                      >
                        <PlayCircle className="mr-1.5 h-4 w-4" />
                        Play
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <Filter className="h-10 w-10 mb-3 text-muted-foreground/50" />
                      <p className="font-semibold">No stations match your current filters.</p>
                      <p className="text-sm">Try adjusting your search or filter criteria.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
       {filteredAndSortedStations.length === 0 && stations.length > 0 && !generalSearchTerm && selectedGenres.size === 0 && (
         <p className="text-muted-foreground text-center py-6">No stations available with current filters.</p>
       )}
      </Card>
    </div>
  );
}


    