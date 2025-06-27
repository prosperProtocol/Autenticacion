import {
  Injectable,
  ExecutionContext,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { AipriseStrategy } from 'src/common/strategy/aiprise.strategy';

@Injectable()
export class AipriseGuard extends AipriseStrategy {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const {headers, body} = context.switchToHttp().getRequest();

      const headersValidation = await this.validateCredentials(headers, body);

      return headersValidation;
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
