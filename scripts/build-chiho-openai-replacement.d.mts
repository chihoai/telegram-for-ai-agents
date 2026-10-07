export function buildOpenAiReplacement(options: {
  publishedZip: string;
  output: string;
  version: string;
  icon?: string;
}): Promise<{
  name: string;
  version: string;
  appId: string;
  requiredResource: string;
  endpointDeclaredByPackage: boolean;
  endpointConfigurationVerified: boolean;
}>;

export const buildUnofficialTelegramOpenAiReplacement: typeof buildOpenAiReplacement;
