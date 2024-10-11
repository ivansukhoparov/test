import { Injectable } from '@nestjs/common';
import {
  Session,
  SessionDocument,
  SessionModelType,
} from '../domain/session.entity';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class SessionsRepository {
  constructor(
    @InjectModel(Session.name) private readonly sessionModel: SessionModelType,
  ) {}

  async deleteAllSessionsExceptCurrent(
    userId: string,
    currentDeviceId: string,
  ) {
    const result = await this.sessionModel.deleteMany({
      userId: userId,
      deviceId: { $ne: currentDeviceId },
    });

    return result.deletedCount > 0;
  }

  async deleteSessionByDeviceId(deviceId: string): Promise<boolean> {
    const result = await this.sessionModel.deleteOne({ deviceId: deviceId });

    return result.deletedCount === 1;
  }

  async findSessionByDeviceId(
    deviceId: string,
  ): Promise<SessionDocument | null> {
    const session: SessionDocument | null = await this.sessionModel.findOne({
      deviceId: deviceId,
    });

    if (session) {
      return session;
    } else {
      return null;
    }
  }

  async createSession(newSessionDTO: Session) {
    const newSession = new this.sessionModel(newSessionDTO);

    const savedSession = await newSession.save();

    if (savedSession) {
      return newSession._id.toString();
    } else {
      return null;
    }
  }

  async updateIatExp(
    userId: string,
    deviceId: string,
    iat: number,
    exp: number,
  ): Promise<boolean> {
    const result = await this.sessionModel.updateOne(
      { userId: userId, deviceId: deviceId },
      { $set: { iat: new Date(iat), exp: new Date(exp) } },
    );

    return result.modifiedCount === 1;
  }
}
