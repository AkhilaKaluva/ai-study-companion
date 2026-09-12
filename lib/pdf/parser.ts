// PDF parser that extracts text page-by-page and chunks with metadata preservation
// Using pdf-parse with custom page render hook

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse/lib/pdf-parse.js");

export interface PageContent {
  pageNumber: number;
  text: string;
}

export interface DocumentChunkOutput {
  pageNumber: number;
  chunkIndex: number;
  content: string;
}

export interface ParsedDocument {
  pageCount: number;
  fullText: string;
  pages: PageContent[];
  chunks: DocumentChunkOutput[];
}

/**
 * Extracts text from PDF buffer preserving page numbers, then chunks each page.
 */
export async function parseAndChunkPdf(
  buffer: Buffer,
  maxWordsPerChunk: number = 250,
  overlapWords: number = 40
): Promise<ParsedDocument> {
  const pages: PageContent[] = [];

  const options = {
    pagerender: async function (pageData: any) {
      const textContent = await pageData.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      const pageNumber = (pageData.pageIndex || 0) + 1;
      pages.push({ pageNumber, text: pageText });
      return pageText;
    },
  };

  const parsed = await pdfParse(buffer, options);

  // Sort pages by page number just in case
  pages.sort((a, b) => a.pageNumber - b.pageNumber);

  // Now create page-bounded chunks
  const chunks: DocumentChunkOutput[] = [];
  let globalChunkIndex = 0;

  for (const page of pages) {
    if (!page.text || page.text.length < 10) continue;

    const words = page.text.split(" ");
    if (words.length <= maxWordsPerChunk) {
      chunks.push({
        pageNumber: page.pageNumber,
        chunkIndex: globalChunkIndex++,
        content: page.text,
      });
    } else {
      let start = 0;
      while (start < words.length) {
        const end = Math.min(start + maxWordsPerChunk, words.length);
        const chunkText = words.slice(start, end).join(" ").trim();
        if (chunkText.length > 0) {
          chunks.push({
            pageNumber: page.pageNumber,
            chunkIndex: globalChunkIndex++,
            content: chunkText,
          });
        }
        if (end >= words.length) break;
        start += maxWordsPerChunk - overlapWords;
      }
    }
  }

  return {
    pageCount: pages.length || parsed.numpages || 1,
    fullText: parsed.text || "",
    pages,
    chunks,
  };
}
