import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import {Observable} from 'rxjs';
import morgan from 'morgan';

@Injectable()
export class LogInterceptor implements NestInterceptor {
  private readonly morganMiddleware: any;

  constructor() {
    this.morganMiddleware = morgan((tokens, req: any, res) => {
      return [
        `Method: ${tokens.method(req, res)}`,
        `URL: ${tokens.url(req, res)}`,
        `Status: ${tokens.status(req, res)}`,
        `Query Params: ${JSON.stringify(req.query)}`,
        `Body: ${JSON.stringify(req.body)}`,
        `Response Time: ${tokens['response-time'](req, res)} ms`,
      ].join(' | ');
    });
  }
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const {url} = request;

    if (url === '/api/v1/ping') {
      return next.handle();
    }

    this.morganMiddleware(request, response, (err: any) => {
      if (err) {
        console.error('Morgan error:', err);
      }
    });
    return next.handle();
  }
}
