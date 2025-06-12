
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// IMPORTANT FOR DEPLOYMENT:
// When deploying to Firebase App Hosting or any other cloud environment,
// ensure that the environment has the necessary credentials and permissions
// (e.g., via Application Default Credentials and IAM roles like "Vertex AI User")
// for Genkit to access Google AI services.
// If API keys are used directly (not recommended for server environments),
// they must be securely configured as environment variables.

export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.0-flash',
});

