import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import * as dayjs from 'dayjs';

import { User, UserStatus } from 'src/common/entities/user.entity';
import { OtpToken } from 'src/common/entities/otp-token.entity';
import { Wallets } from 'src/common/entities/wallets';

import { AwsService } from 'src/common/services/aws.service';
import { EmailService } from 'src/common/services/email.service';
import {
  // randomOtpGenerator,
  uuid,
  isValidEmail,
  generateMemo,
} from 'src/common/utils/utils';
import { AuthLoginRequest } from 'src/modules/auth/dtos/auth.validation.dto';
import {
  ConfirmDetailsDto,
  // ConfirmDetailsDto,
  DocType,
  UpdateAddressDto,
} from 'src/modules/auth/dtos/kyc.dto';
import { ConfigService } from '@nestjs/config';
import { StellarService } from 'src/common/services/stellar.service';
import { Sep10AuthGetDto, Sep10AuthPostDto } from './dtos/auth.dto';

@Injectable()
export class AuthService {
  public className = this.constructor.name;
  private readonly logger = new Logger(this.className);
  private isLocal: boolean;
  // private readonly serverConfig: any = this.configService.get('serverConfig');
  private readonly stellarConfig: any = this.configService.get('stellarConfig');
  constructor(
    private awsService: AwsService,
    private configService: ConfigService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private readonly stellarService: StellarService,
    @InjectRepository(OtpToken)
    private otpRepo: Repository<OtpToken>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    @InjectRepository(Wallets)
    private walletsRepo: Repository<Wallets>,
  ) {
    const dbUrl = this.configService.get('config.database.url');
    this.isLocal = dbUrl?.includes('localhost');
  }

  async checkTxForClientDomain(txXDR: string) {
    return await this.stellarService.checkTxForClientDomain(txXDR);
  }

  async checkClientDomain(client_domain: string) {
    const options = {
      method: 'GET',
      url: `https://${client_domain}/.well-known/stellar.toml`,
    };
    try {
      await axios.request(options);
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException(`Unable to check SEP-1 stellar.toml file`);
    }
  }

  async getKnowFile() {
    const options = {
      method: 'GET',
      url: `https://${this.stellarConfig.home_domain_anchor}/.well-known/stellar.toml`,
    };
    try {
      const server = `https://${this.stellarConfig.home_domain}/api/v1`;
      const transfer_server = `TRANSFER_SERVER="${server}"\nWEB_AUTH_ENDPOINT`;
      const response = await axios.request(options);
      return response.data
        .replace(
          this.stellarConfig.home_domain_anchor,
          `${this.stellarConfig.home_domain}/api/v1`,
        )
        .replace('WEB_AUTH_ENDPOINT', transfer_server);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async vibrantAuthGet(payload: Sep10AuthGetDto) {
    try {
      return await this.stellarService.getSep10Challenge({
        clientAccountID: payload.account,
        clientDomain: payload.client_domain,
        homeDomain: payload.home_domain,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async vibrantAuthPost(payload: Sep10AuthPostDto) {
    try {
      return await this.stellarService.readChallengeTx({
        transaction: payload.transaction,
      });
    } catch (error) {
      throw error;
    }
  }

  async getWidgetUrl(userWallet: string): Promise<string> {
    const query = `
      select *
      from "user"
      where "deletedAt" is null
      and "stellarPublic" = $1
      limit 1;
    `;
    const [user] = await this.usersRepo.query(query, [userWallet]);

    if (!user) {
      // user = await this.userService.newWallet(userWallet);
    }

    const loginToken = uuid();
    const dateLoginToken = new Date().toISOString();
    const updateQuery = `
      update "user" set
      "loginToken" = $1,
      "dateLoginToken" = $2
      where "stellarPublic" = $3;
    `;
    await this.usersRepo.query(updateQuery, [
      loginToken,
      dateLoginToken,
      userWallet,
    ]);

    return `${this.stellarConfig.widget_url}?uuid=${loginToken}`;
  }

  async passwordlessLogin(email: string) {
    const user: User = await this.usersRepo.findOneBy({
      email,
      deletedAt: null,
    });

    const code = uuid();

    if (!user) {
      return { code };
    }

    const token = '1234'; // randomOtpGenerator();
    const expiresAt = dayjs().add(15, 'm').toISOString();

    await this.otpRepo.insert({
      token,
      code,
      user,
      expiresAt,
    });

    // await this.emailService.sendOtpEmail(user.email, token);

    return {
      code,
    };
  }

  async passwordlessToken(code: string, token: string) {
    const otp = await this.otpRepo.findOne({
      where: { code },
      relations: ['user'],
    });

    if (!otp?.id) {
      return {
        accessToken: '',
        expiresAt: dayjs().toISOString(),
      };
    }

    if (otp.alreadyUsed) {
      throw new UnauthorizedException('Request expired');
    }

    if (otp.retries >= 3) {
      throw new UnauthorizedException('Request expired');
    }

    const isExpired = dayjs().isAfter(otp.expiresAt);

    if (isExpired) {
      throw new UnauthorizedException('Request expired');
    }

    const isValidToken = otp.token === token;

    if (!isValidToken) {
      await this.otpRepo.update(
        {
          id: otp.id,
        },
        { retries: otp.retries + 1 },
      );

      throw new BadRequestException('Invalid Code');
    }

    await this.otpRepo.update(
      {
        id: otp.id,
      },
      { alreadyUsed: true },
    );

    const user: User = await this.usersRepo.findOneBy({ id: otp.user.id });

    const payload = {
      id: user.id,
      email: user.email,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
    };
  }

  async signup(payload: AuthLoginRequest): Promise<{ code: string }> {
    const emailIsValid = isValidEmail(payload.email);

    if (!emailIsValid) {
      throw new BadRequestException('Email is required');
    }

    const user: User = await this.usersRepo.findOneBy({
      email: payload.email,
      deletedAt: null,
    });

    if (user) {
      return await this.passwordlessLogin(payload.email);
    }

    const memo = generateMemo();

    const newUser = await this.usersRepo.create({
      email: payload.email,
      status: UserStatus.open,
    });
    await this.usersRepo.save(newUser);

    const wallet = this.walletsRepo.create({
      asset: 'USDC',
      balance: 0,
      chain: 'Stellar',
      memo,
      user,
    });

    await this.walletsRepo.save(wallet);
    return await this.passwordlessLogin(payload.email);
  }

  async uploadDocument(
    userId: number,
    file: Express.Multer.File,
    docType: DocType,
  ): Promise<User> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const fileExt = file.originalname.split('.').pop();
    const upload = await this.awsService.uploadFile(file, `prosper`, fileExt);

    if (!upload) {
      throw new Error('Upload to S3 failed');
    }

    switch (docType) {
      case DocType.idCardFront:
        user.docFront = upload.filename;
        user.docFrontUri = upload.Location;
        break;
      case DocType.idCardBack:
        user.docBack = upload.filename;
        user.docBackUri = upload.Location;
        break;
    }

    return await this.usersRepo.save(user);
  }

  async getProfile(userId: number): Promise<User> {
    try {
      const user: User = await this.usersRepo.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }
      return user;
    } catch (error) {
      this.logger.error(
        `Error confirming details for user ${userId}`,
        error.stack,
      );
      throw error;
    }
  }

  async confirmDetails(userId: number, dto: ConfirmDetailsDto): Promise<User> {
    try {
      const user = await this.usersRepo.findOne({ where: { id: userId } });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      user.firstName = dto.firstName;
      user.lastName = dto.lastName;
      user.birthdate = dto.birthdate;
      (user as any).gender = dto.gender;

      return await this.usersRepo.save(user);
    } catch (error) {
      this.logger.error(
        `Error confirming details for user ${userId}`,
        error.stack,
      );
      throw error;
    }
  }

  async updateAddress(userId: number, dto: UpdateAddressDto): Promise<User> {
    try {
      const user = await this.usersRepo.findOne({ where: { id: userId } });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      user.street = dto.street;
      user.city = dto.city;
      user.state = dto.state;
      user.country = dto.country;
      user.postalCode = dto.postalCode;
      user.status = UserStatus.pending;

      setTimeout(async () => {
        try {
          this.runCheckPendingUsers();
          this.logger.log('Manual pending user check executed after delay');
        } catch (error) {
          this.logger.error('Error running manual pending user check:', error);
        }
      }, 45_000);

      return await this.usersRepo.save(user);
    } catch (error) {
      this.logger.error(
        `Error updating address for user ${userId}`,
        error.stack,
      );
      throw error;
    }
  }

  async validateUsers(userId: number): Promise<boolean> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const hasConfirmedDetails =
      !!user.firstName && !!user.lastName && !!user.birthdate && !!user.gender;

    const hasAddress =
      !!user.street &&
      !!user.city &&
      !!user.state &&
      !!user.country &&
      !!user.postalCode;

    const hasUploadedDocs =
      !!user.docFront &&
      !!user.docBack &&
      !!user.docFrontUri &&
      !!user.docBackUri;

    return hasConfirmedDetails && hasAddress && hasUploadedDocs;
  }

  @Cron(CronExpression.EVERY_30_MINUTES, { name: 'Check Pending User' })
  async runCheckPendingUsers(): Promise<void> {
    if (this.isLocal) return;
    this.logger.log('Running pending user check...');
    const pendingUsers = await this.usersRepo.find({
      where: { status: UserStatus.pending },
    });

    for (const user of pendingUsers) {
      const isComplete = await this.validateUsers(user.id);

      if (isComplete) {
        user.status = UserStatus.active;
        await this.usersRepo.save(user);
        this.logger.log(`User ${user.id} marked as complete`);
      }
    }
  }
}
