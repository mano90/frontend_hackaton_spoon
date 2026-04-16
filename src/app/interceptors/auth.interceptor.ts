import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { switchMap } from 'rxjs/operators';

import { AuthTokenService } from '../services/auth-token.service';

const SKIP_IF_URL_INCLUDES = ['/api/auth/token', '/api/health'];

function shouldAttachAuth(url: string): boolean {
  return SKIP_IF_URL_INCLUDES.every((fragment) => !url.includes(fragment));
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!shouldAttachAuth(req.url)) {
    return next(req);
  }
  const auth = inject(AuthTokenService);
  return auth.ensureToken$().pipe(
    switchMap((token) =>
      next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }))
    )
  );
};
