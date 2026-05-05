import { createWorker } from "tesseract.js";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";

export type PdfExtractionProgress = {
  phase: "selectable-text" | "ocr-loading" | "ocr-page" | "ocr-recognizing";
  message: string;
};

export async function extractPdfText(
  file: File,
  onProgress?: (progress: PdfExtractionProgress) => void,
) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  onProgress?.({
    phase: "selectable-text",
    message: "Checking for selectable PDF text...",
  });
  const text = await extractSelectablePdfText(bytes);

  if (text) {
    return { text, method: "selectable-text" as const };
  }

  const ocrText = await extractTextWithOcr(buffer, onProgress);

  if (!ocrText) {
    throw new Error(
      "No text was found in this PDF. Try a clearer scan or paste the document text manually.",
    );
  }

  return { text: ocrText, method: "ocr" as const };
}

async function extractSelectablePdfText(bytes: Uint8Array) {
  const chunks = [decodeBytes(bytes)];

  for (const stream of findPdfStreams(bytes)) {
    chunks.push(decodeBytes(stream.bytes));

    if (stream.isFlateEncoded && "DecompressionStream" in window) {
      try {
        chunks.push(await inflateStream(stream.bytes));
      } catch {
        // Some PDFs use predictors or stream filters this lightweight extractor does not support.
      }
    }
  }

  return chunks
    .flatMap(extractTextOperators)
    .map(cleanPdfText)
    .filter(Boolean)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function findPdfStreams(bytes: Uint8Array) {
  const text = decodeBytes(bytes);
  const streams: Array<{ bytes: Uint8Array; isFlateEncoded: boolean }> = [];
  const streamPattern = /([\s\S]{0,240})stream\r?\n/g;
  let match: RegExpExecArray | null;

  while ((match = streamPattern.exec(text))) {
    const streamStart = match.index + match[0].length;
    const streamEnd = text.indexOf("endstream", streamStart);
    if (streamEnd === -1) break;

    const dictionary = match[1] ?? "";
    streams.push({
      bytes: bytes.slice(streamStart, streamEnd),
      isFlateEncoded: dictionary.includes("/FlateDecode"),
    });
    streamPattern.lastIndex = streamEnd + "endstream".length;
  }

  return streams;
}

async function inflateStream(bytes: Uint8Array) {
  const stream = new Blob([bytes])
    .stream()
    .pipeThrough(new DecompressionStream("deflate"));
  return decodeBytes(new Uint8Array(await new Response(stream).arrayBuffer()));
}

function extractTextOperators(text: string) {
  const matches = [
    ...text.matchAll(/\((?:\\.|[^\\)])*\)\s*Tj/g),
    ...text.matchAll(/\[((?:.|\n)*?)\]\s*TJ/g),
  ];

  return matches.flatMap((match) =>
    [...match[0].matchAll(/\((?:\\.|[^\\)])*\)/g)].map(([value]) =>
      value.slice(1, -1),
    ),
  );
}

function cleanPdfText(value: string) {
  return value
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\n")
    .replace(/\\t/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeBytes(bytes: Uint8Array) {
  return new TextDecoder("latin1").decode(bytes);
}

const tesseractWorkerUrl = "/ocr/tesseract-worker/worker.min.js";
const tesseractCoreUrl = "/ocr/tesseract-core";
const ocrMaxPages = Number(import.meta.env.VITE_OCR_MAX_PAGES ?? 4);

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

async function extractTextWithOcr(
  buffer: ArrayBuffer,
  onProgress?: (progress: PdfExtractionProgress) => void,
) {
  onProgress?.({ phase: "ocr-loading", message: "Loading OCR tools..." });
  const document = await getDocument({ data: buffer.slice(0) }).promise;
  const pageCount = Math.min(
    document.numPages,
    Number.isFinite(ocrMaxPages) ? ocrMaxPages : 4,
  );
  const pageTexts: string[] = [];
  const worker = await createWorker("eng", 1, {
    workerPath: tesseractWorkerUrl,
    corePath: tesseractCoreUrl,
    logger: (event) => {
      if (event.status === "recognizing text") {
        const percent = Number.isFinite(event.progress)
          ? Math.round(event.progress * 100)
          : 0;
        onProgress?.({
          phase: "ocr-recognizing",
          message: `Recognizing text with OCR... ${percent}%`,
        });
      }
    },
  });

  try {
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      onProgress?.({
        phase: "ocr-page",
        message: `Rendering page ${pageNumber} of ${pageCount} for OCR...`,
      });
      const page = await document.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 2.4 });
      const canvas = window.document.createElement("canvas");
      const context = canvas.getContext("2d", { willReadFrequently: true });

      if (!context) {
        throw new Error("OCR is not available in this browser.");
      }

      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvas, canvasContext: context, viewport }).promise;

      onProgress?.({
        phase: "ocr-recognizing",
        message: `Recognizing page ${pageNumber} of ${pageCount}...`,
      });
      const result = await worker.recognize(canvas);
      const text = cleanOcrText(result.data.text);

      if (text) {
        pageTexts.push(text);
      }
    }
  } finally {
    await worker.terminate();
  }

  return pageTexts.join("\n\n").trim();
}

function cleanOcrText(value: string) {
  return value
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

type PdfDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPage>;
};

type PdfPage = {
  getViewport: (options: { scale: number }) => PdfViewport;
  render: (options: {
    canvasContext: CanvasRenderingContext2D;
    viewport: PdfViewport;
  }) => {
    promise: Promise<void>;
  };
};

type PdfViewport = {
  width: number;
  height: number;
};
