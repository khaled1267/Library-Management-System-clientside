import type { Metadata } from 'next';
import BookDetailsClient from '@/components/book-details-client';
import { normalizeApiBaseUrl } from '@/lib/api';

type RouteProps = { params: Promise<{ id: string }> };
const libraryName = 'Barguna Polytechnic Library';
const objectIdPattern = /^[a-f\d]{24}$/i;

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { id } = await params;
  if (!objectIdPattern.test(id)) return { title: `Book not found | ${libraryName}` };
  const apiBaseUrl = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL);
  if (!apiBaseUrl) return { title: `Book details | ${libraryName}` };

  try {
    const response = await fetch(`${apiBaseUrl}/books/${id}/availability`, { cache: 'no-store' });
    if (!response.ok) return { title: `Book not found | ${libraryName}` };
    const payload = await response.json();
    const book = payload?.book;
    if (!book?.title) return { title: `Book not found | ${libraryName}` };
    return {
      title: `${book.title} | ${libraryName}`,
      description: book.description?.trim().slice(0, 160) || `View availability and details for ${book.title}.`,
    };
  } catch {
    return { title: `Book details | ${libraryName}` };
  }
}

export default async function BookDetailsRoute({ params }: RouteProps) {
  const { id } = await params;
  return <BookDetailsClient bookId={id} />;
}
