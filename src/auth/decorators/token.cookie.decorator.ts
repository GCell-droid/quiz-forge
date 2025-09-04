import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const TokenCookie = createParamDecorator(
  (data, ctx: ExecutionContext) => {
    const res = ctx.switchToHttp().getResponse();
    return res;
  },
);
