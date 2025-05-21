
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
import { Card } from '@/components/ui/card'; // Import Card
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
          Browse and sort your favorite classic radio stations. Click headers to sort.
        </p>
      </header>

      <Card className="shadow-lg bg-[hsl(0,0%,12%)] border-[hsl(0,0%,20%)]"> {/* Dark grey theme for table card */}
        <div className="overflow-hidden rounded-lg"> {/* Ensures border radius applies to table */}
          <Table>
            <TableHeader>
              <TableRow className="border-b-[hsl(0,0%,25%)] hover:bg-[hsl(0,0%,15%)]">
                <TableHead className="w-[60px] hidden sm:table-cell py-2 px-3 text-xs text-muted-foreground"></TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-[hsl(0,0%,15%)] transition-colors py-2 px-3 text-xs text-muted-foreground h-10"
                  onClick={() => requestSort('name')}
                >
                  <div className="flex items-center text-foreground/90"> {/* Brighter text for header */}
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
              {sortedStations.map((station) => (
                <TableRow key={station.id} className="border-b-[hsl(0,0%,16%)] hover:bg-[hsl(0,0%,15%)]">
                  <TableCell className="hidden sm:table-cell py-2 px-3">
                    <Image
                      src={station.faviconUrl || `https://placehold.co/32x32.png`}
                      alt={`${station.name} logo`}
                      width={32}
                      height={32}
                      className="rounded-sm border border-[hsl(0,0%,25%)]"
                      data-ai-hint="radio logo"
                    />
                  </TableCell>
                  <TableCell className="font-medium text-foreground/90 py-2 px-3 text-sm">{station.name}</TableCell>
                  <TableCell className="text-muted-foreground py-2 px-3 text-sm">{station.genre}</TableCell>
                  <TableCell className="text-muted-foreground hidden md:table-cell py-2 px-3 text-sm">{station.country}</TableCell>
                  <TableCell className="text-right py-2 px-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePlayStation(station)}
                      className="text-accent hover:text-accent-foreground hover:bg-accent/90 h-8 px-2"
                    >
                      <PlayCircle className="mr-1.5 h-4 w-4" />
                      Play
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
       {sortedStations.length === 0 && (
         <p className="text-muted-foreground text-center py-6">No stations available.</p>
       )}
      </Card>
    </div>
  );
}
