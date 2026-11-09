// Place this inside src/lib/browserNav.ts or wherever inputs are parsed
export function resolveInputToURL(input: string): string {
  const trimmed = input.trim();
  
  // Checks if it looks like a domain name (e.g., example.com, localhost:3000)
  const isUrlPattern = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(:\d+)?(\/.*)?$/;
  const hasProtocol = /^https?:\/\//i.test(trimmed);

  if (hasProtocol) {
    return trimmed;
  }
  
  if (isUrlPattern.test(trimmed)) {
    return `https://${trimmed}`;
  }

  // If it's not a URL, fallback to your internal search query routing view
  return trimmed; 
}
