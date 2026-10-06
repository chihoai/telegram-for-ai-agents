export function buildOpenAiReplacement(options: {
  publishedZip: string;
  output: string;
  version: string;
}): Promise<{
  name: string;
  version: string;
  appId: string;
  requiredResource: string;
  endpointConfiguredByPackage: boolean;
}>;
