import { Injectable } from '@nestjs/common';
import {
  Session,
  SessionDocument,
  SessionModelType,
} from '../domain/session.entity';
import { DeviceViewModel } from '../api/models/output/session.output.model';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class SessionsQueryRepository {
  constructor(
    @InjectModel(Session.name) private readonly sessionModel: SessionModelType,
  ) {}
  mapToOutput(session: SessionDocument): DeviceViewModel {
    return {
      ip: session.ip,
      title: session.deviceName,
      lastActiveDate: session.iat.toISOString(),
      deviceId: session.deviceId,
    };
  }

  async getAllActiveSessions(
    userId: string,
  ): Promise<DeviceViewModel[] | null> {
    const devices: SessionDocument[] | null = await this.sessionModel.find({
      userId: userId,
    });

    if (devices) {
      return devices.map(this.mapToOutput);
    } else {
      return null;
    }
  }
}
