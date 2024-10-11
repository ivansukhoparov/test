import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import { uuid } from 'uuidv4';
import { SessionsRepository } from '../../../sessions/infrastructure/sessions.repository';
import { ObjectId } from 'mongodb';
import { Session } from '../../../sessions/domain/session.entity';
import { appSettings } from '../../../../settings/app-settings';

export class CreateTokensAndSessionCommand {
  constructor(
    public userId: string,
    public deviceName: string,
    public ip: string,
  ) {}
}

@CommandHandler(CreateTokensAndSessionCommand)
export class CreateTokensAndSessionUseCase
  implements ICommandHandler<CreateTokensAndSessionCommand>
{
  constructor(
    private readonly jwtService: JwtService,
    private readonly sessionsRepository: SessionsRepository,
  ) {}

  async execute(
    command: CreateTokensAndSessionCommand,
  ): Promise<{ accessToken: string; refreshToken: string } | null> {
    const { userId, deviceName, ip } = command;

    const accessToken = await this.createAccessToken(userId);
    const refreshToken = await this.createRefreshToken(userId);
    if (!accessToken || !refreshToken) return null;

    const isSessionCreated: boolean = await this.createSession(
      userId,
      deviceName,
      ip,
      refreshToken,
    );
    if (!isSessionCreated) return null;

    return { accessToken, refreshToken };
  }

  private async createAccessToken(userId: string): Promise<string | null> {
    const accessTokenPayload = { sub: userId };
    const accessToken = await this.jwtService.signAsync(accessTokenPayload, {
      secret: appSettings.api.JWT_ACCESS_TOKEN_SECRET,
      expiresIn: appSettings.api.ACCESS_TOKEN_LIFE_TIME,
    });

    if (!accessToken) return null;
    return accessToken;
  }

  private async createRefreshToken(userId: string): Promise<string | null> {
    const deviceId = uuid();
    const refreshTokenPayload = { sub: userId, deviceId: deviceId };

    const refreshToken = await this.jwtService.signAsync(refreshTokenPayload, {
      secret: appSettings.api.JWT_REFRESH_TOKEN_SECRET,
      expiresIn: appSettings.api.REFRESH_TOKEN_LIFE_TIME,
    });

    if (!refreshToken) return null;
    return refreshToken;
  }

  private async createSession(
    userId: string,
    deviceName: string,
    ip: string,
    refreshToken: string,
  ): Promise<boolean> {
    const payload = await this.jwtService.decode(refreshToken);

    const newSession: Session = {
      _id: new ObjectId(),
      userId: userId,
      deviceId: payload.deviceId,
      deviceName: deviceName,
      ip: ip,
      iat: new Date(payload.iat),
      exp: new Date(payload.exp),
    };

    const createdSession =
      await this.sessionsRepository.createSession(newSession);

    if (!createdSession) return false;
    return true;
  }
}
