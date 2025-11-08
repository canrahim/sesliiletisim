import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class FileCorsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse();
    const request = context.switchToHttp().getRequest();
    
    return next.handle().pipe(
      tap(() => {
        // Mevcut CORS header'ı varsa override et (duplicate önlemek için)
        response.removeHeader('Access-Control-Allow-Origin');
        response.removeHeader('Access-Control-Allow-Methods');
        response.removeHeader('Access-Control-Allow-Headers');
        
        // CORS header'larını ekle - sadece upload endpoints için
        response.setHeader('Access-Control-Allow-Origin', '*');
        response.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        response.setHeader('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept, Authorization');
        response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        response.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
      }),
    );
  }
}

