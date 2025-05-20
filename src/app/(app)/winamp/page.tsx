
'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
import { ListMusic, PlayCircle, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import Image from 'next/image';

type SortKey = keyof Pick<RadioStation, 'name' | 'genre' | 'country'>;
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

export default function WinampPage() {
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const player = usePlayer();

  useEffect(() => {
    setStations(mockStations);
  }, []);

  const sortedStations = useMemo(() => {
    let sortableItems = [...stations];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [stations, sortConfig]);

  const requestSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: SortKey) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/70" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ArrowUp className="ml-2 h-4 w-4 text-accent" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4 text-accent" />
    );
  };

  const handlePlayStation = (station: RadioStation) => {
    player.playStation(station);
  };

  return (
    <div className="container mx-auto">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <ListMusic className="h-10 w-10 text-accent" />
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Winamp Stations
          </h1>
        </div>
        <p className="text-lg text-muted-foreground">
          Browse and sort your favorite classic radio stations. Click headers to sort.
        </p>
      </header>

      <div className="rounded-lg border shadow-sm bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px] hidden sm:table-cell"></TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => requestSort('name')}
              >
                <div className="flex items-center">
                  Name {getSortIcon('name')}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => requestSort('genre')}
              >
                <div className="flex items-center">
                  Genre {getSortIcon('genre')}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50 transition-colors hidden md:table-cell"
                onClick={() => requestSort('country')}
              >
                <div className="flex items-center">
                  Country {getSortIcon('country')}
                </div>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedStations.map((station) => (
              <TableRow key={station.id} className="hover:bg-muted/20">
                <TableCell className="hidden sm:table-cell">
                  <Image
                    src={station.faviconUrl || `https://placehold.co/40x40.png`}
                    alt={`${station.name} logo`}
                    width={40}
                    height={40}
                    className="rounded-sm border"
                    data-ai-hint="radio logo"
                  />
                </TableCell>
                <TableCell className="font-medium text-foreground">{station.name}</TableCell>
                <TableCell className="text-muted-foreground">{station.genre}</TableCell>
                <TableCell className="text-muted-foreground hidden md:table-cell">{station.country}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePlayStation(station)}
                    className="text-accent hover:text-accent-foreground hover:bg-accent/90"
                  >
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Play
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
       {sortedStations.length === 0 && (
         <p className="text-muted-foreground text-center mt-8">No stations available.</p>
       )}
    </div>
  );
}
