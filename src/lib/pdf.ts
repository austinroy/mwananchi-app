export async function extractPdfText(file: File) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const chunks = [decodeBytes(bytes)];

  for (const stream of findPdfStreams(bytes)) {
    chunks.push(decodeBytes(stream.bytes));

    if (stream.isFlateEncoded && 'DecompressionStream' in window) {
      try {
        chunks.push(await inflateStream(stream.bytes));
      } catch {
        // Some PDFs use predictors or stream filters this lightweight extractor does not support.
      }
    }
  }

  const text = chunks
    .flatMap(extractTextOperators)
    .map(cleanPdfText)
    .filter(Boolean)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!text) {
    throw new Error('No selectable text was found in this PDF. Scanned PDFs need OCR, which is not wired in yet.');
  }

  return text;
}

function findPdfStreams(bytes: Uint8Array) {
  const text = decodeBytes(bytes);
  const streams: Array<{ bytes: Uint8Array; isFlateEncoded: boolean }> = [];
  const streamPattern = /([\s\S]{0,240})stream\r?\n/g;
  let match: RegExpExecArray | null;

  while ((match = streamPattern.exec(text))) {
    const streamStart = match.index + match[0].length;
    const streamEnd = text.indexOf('endstream', streamStart);
    if (streamEnd === -1) break;

    const dictionary = match[1] ?? '';
    streams.push({
      bytes: bytes.slice(streamStart, streamEnd),
      isFlateEncoded: dictionary.includes('/FlateDecode'),
    });
    streamPattern.lastIndex = streamEnd + 'endstream'.length;
  }

  return streams;
}

async function inflateStream(bytes: Uint8Array) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
  return decodeBytes(new Uint8Array(await new Response(stream).arrayBuffer()));
}

function extractTextOperators(text: string) {
  const matches = [
    ...text.matchAll(/\((?:\\.|[^\\)])*\)\s*Tj/g),
    ...text.matchAll(/\[((?:.|\n)*?)\]\s*TJ/g),
  ];

  return matches.flatMap((match) => [...match[0].matchAll(/\((?:\\.|[^\\)])*\)/g)].map(([value]) => value.slice(1, -1)));
}

function cleanPdfText(value: string) {
  return value
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .replace(/\\t/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeBytes(bytes: Uint8Array) {
  return new TextDecoder('latin1').decode(bytes);
}
