import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import morgan from 'morgan';

@Injectable()
export class LogInterceptor implements NestInterceptor {
  private readonly morganMiddleware: any;

  constructor() {
    this.morganMiddleware = morgan((tokens, req: any, res) => {
      const queryToLog = { ...req.query };
      queryToLog.key = queryToLog.key ? '***' : queryToLog.key;
      queryToLog.privateKey = queryToLog.privateKey ? '***' : queryToLog.privateKey;
      queryToLog.secret = queryToLog.secret ? '***' : queryToLog.secret;
      queryToLog.secretKey = queryToLog.secretKey ? '***' : queryToLog.secretKey;

      const bodyToLog = { ...req.body };
      bodyToLog.password = bodyToLog.password ? '***' : bodyToLog.password;
      bodyToLog.privateKey = bodyToLog.privateKey ? '***' : bodyToLog.privateKey;
      bodyToLog.secret = bodyToLog.secret ? '***' : bodyToLog.secret;
      bodyToLog.secretKey = bodyToLog.secretKey ? '***' : bodyToLog.secretKey;

      return [
        `Method: ${tokens.method(req, res)}`,
        `Date: ${new Date().toISOString()}`,
        `URL: ${tokens.url(req, res)}`,
        `Status: ${tokens.status(req, res)}`,
        `Query Params: ${JSON.stringify(queryToLog)}`,
        `Body: ${JSON.stringify(bodyToLog)}`,
        `Response Time: ${tokens['response-time'](req, res)} ms`,
      ].join(' | ');
    });
  }
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const { url } = request;

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
