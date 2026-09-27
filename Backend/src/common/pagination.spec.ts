import { BadRequestException } from '@nestjs/common';
import { parsePage, toPage } from './pagination';

describe('pagination', () => {
  it('defaults to a bounded first page', () => {
    expect(parsePage()).toEqual({ page: 1, pageSize: 12 });
    expect(toPage(['one'], 25, parsePage())).toEqual({
      items: ['one'],
      page: 1,
      pageSize: 12,
      total: 25,
      totalPages: 3,
    });
  });

  it.each([
    ['0', '12'],
    ['1.5', '12'],
    ['1', '0'],
    ['1', '51'],
    ['oops', '12'],
  ])('rejects invalid page inputs (%s, %s)', (page, pageSize) => {
    expect(() => parsePage(page, pageSize)).toThrow(BadRequestException);
  });
});
