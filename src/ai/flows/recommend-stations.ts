'use server';
/**
 * @fileOverview Radio station recommendation AI agent.
 *
 * - recommendStations - A function that handles the radio station recommendation process.
 * - RecommendStationsInput - The input type for the recommendStations function.
 * - RecommendStationsOutput - The return type for the recommendStations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RecommendStationsInputSchema = z.object({
  listeningHistory: z
    .string()
    .describe(
      'A comma separated list of radio stations the user has listened to in the past.'
    ),
  numberOfRecommendations: z
    .number()
    .default(3)
    .describe('The number of radio stations to recommend.'),
});
export type RecommendStationsInput = z.infer<typeof RecommendStationsInputSchema>;

const RecommendStationsOutputSchema = z.object({
  recommendations: z
    .array(z.string())
    .describe('A list of radio stations recommended for the user.'),
});
export type RecommendStationsOutput = z.infer<typeof RecommendStationsOutputSchema>;

export async function recommendStations(input: RecommendStationsInput): Promise<RecommendStationsOutput> {
  return recommendStationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'recommendStationsPrompt',
  input: {schema: RecommendStationsInputSchema},
  output: {schema: RecommendStationsOutputSchema},
  prompt: `You are a radio station recommendation expert. Based on the user's listening history, you will recommend new radio stations that the user might enjoy.

Here is the user's listening history: {{{listeningHistory}}}

Please recommend {{numberOfRecommendations}} radio stations, and return them as a list.

Do not include any explanation, just the list of radio stations.`,
});

const recommendStationsFlow = ai.defineFlow(
  {
    name: 'recommendStationsFlow',
    inputSchema: RecommendStationsInputSchema,
    outputSchema: RecommendStationsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
