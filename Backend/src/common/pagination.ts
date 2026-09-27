import { BadRequestException } from '@nestjs/common';

export interface PageOptions {
  page: number;
  pageSize: number;
}

export interface Page<T> extends PageOptions {
  items: T[];
  total: number;
  totalPages: number;
}

export function parsePage(page?: string, pageSize?: string): PageOptions {
  const parsedPage = page === undefined ? 1 : Number(page);
  const parsedSize = pageSize === undefined ? 12 : Number(pageSize);
  if (
    !Number.isSafeInteger(parsedPage) ||
    parsedPage < 1 ||
    !Number.isSafeInteger(parsedSize) ||
    parsedSize < 1 ||
    parsedSize > 50 ||
    !Number.isSafeInteger((parsedPage - 1) * parsedSize)
  ) {
    throw new BadRequestException(
      'page must be at least 1 and pageSize must be between 1 and 50',
    );
  }
  return { page: parsedPage, pageSize: parsedSize };
}

export function toPage<T>(
  items: T[],
  total: number,
  options: PageOptions,
): Page<T> {
  return {
    items,
    total,
    page: options.page,
    pageSize: options.pageSize,
    totalPages: Math.ceil(total / options.pageSize),
  };
}
