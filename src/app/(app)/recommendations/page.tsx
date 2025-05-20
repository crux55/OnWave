'use client';

import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { recommendStations, type RecommendStationsInput, type RecommendStationsOutput } from '@/ai/flows/recommend-stations';
import { Loader2, Wand2, Music, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from '@/hooks/use-toast';

const recommendationsFormSchema = z.object({
  listeningHistory: z.string().min(10, { message: "Please describe your listening history in at least 10 characters." }),
  numberOfRecommendations: z.number().min(1).max(10).default(3),
});

type RecommendationsFormValues = z.infer<typeof recommendationsFormSchema>;

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<RecommendationsFormValues>({
    resolver: zodResolver(recommendationsFormSchema),
    defaultValues: {
      listeningHistory: '',
      numberOfRecommendations: 3,
    },
  });

  const onSubmit: SubmitHandler<RecommendationsFormValues> = async (data) => {
    setIsLoading(true);
    setError(null);
    setRecommendations(null);
    try {
      const result: RecommendStationsOutput = await recommendStations(data);
      if (result && result.recommendations) {
        setRecommendations(result.recommendations);
        toast({
          title: "Recommendations Ready!",
          description: `We found ${result.recommendations.length} new stations for you.`,
        });
      } else {
        setError("Received an unexpected response from the AI. Please try again.");
         toast({
          title: "Uh Oh!",
          description: "Failed to get recommendations. No specific stations returned.",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      console.error("Error getting recommendations:", e);
      setError(e.message || "An error occurred while fetching recommendations. Please try again.");
      toast({
        title: "Error",
        description: e.message || "Failed to get recommendations.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl">
      <header className="mb-8 text-center">
        <Wand2 className="mx-auto h-16 w-16 text-accent mb-4" />
        <h1 className="text-4xl font-bold tracking-tight text-foreground">AI Station Explorer</h1>
        <p className="text-lg text-muted-foreground mt-2">
          Tell us what you like, and our AI will suggest new radio stations for you to discover.
        </p>
      </header>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>Get Recommendations</CardTitle>
          <CardDescription>
            Enter some radio stations or genres you enjoy, and we'll find similar ones.
            For example: "Synthwave FM, 80s retro, lofi hip hop radio".
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="listeningHistory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="listeningHistory" className="text-base">Your Listening History</FormLabel>
                    <FormControl>
                      <Textarea
                        id="listeningHistory"
                        placeholder="e.g., KEXP Seattle, BBC Radio 6 Music, Chillhop Raccoon, classical music, indie rock..."
                        className="min-h-[120px] text-base resize-none focus-visible:ring-accent"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Optional: Number of recommendations - keeping it simple for now by using default */}
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isLoading} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground py-3 text-base">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Finding Stations...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-5 w-5" />
                    Get My Recommendations
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      {error && (
         <Alert variant="destructive" className="mt-8">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {recommendations && recommendations.length > 0 && (
        <Card className="mt-10 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="h-6 w-6 text-primary" />
              <span>Here are your recommendations:</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {recommendations.map((rec, index) => (
                <li key={index} className="p-4 bg-primary/10 border border-primary/20 rounded-lg shadow-sm text-foreground hover:bg-primary/20 transition-colors">
                  <p className="text-lg font-medium">{rec}</p>
                  {/* In a real app, you might search for this station name in your database to make it playable */}
                </li>
              ))}
            </ul>
          </CardContent>
           <CardFooter>
            <p className="text-sm text-muted-foreground">
              Note: These are AI-generated names. You may need to search for these stations in the "Browse Stations" section.
            </p>
          </CardFooter>
        </Card>
      )}

      {recommendations && recommendations.length === 0 && !error && (
         <Alert className="mt-8 bg-secondary/50">
           <Music2 className="h-5 w-5 text-secondary-foreground" />
           <AlertTitle className="text-secondary-foreground">No Specific Recommendations</AlertTitle>
           <AlertDescription className="text-muted-foreground">
            The AI couldn't pinpoint specific new stations based on your input this time. Try being more specific or broader in your description.
           </AlertDescription>
         </Alert>
      )}
    </div>
  );
}
