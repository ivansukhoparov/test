import { Injectable } from '@nestjs/common';
import { MeViewModel } from '../api/models/output/output.models';
import {
  User,
  UserDocument,
  UserModelType,
} from '../../users/domain/user.entity';
import { InjectModel } from '@nestjs/mongoose';
import { ObjectId } from 'mongodb';

@Injectable()
export class AuthQueryRepository {
  constructor(@InjectModel(User.name) private userModel: UserModelType) {}

  getMyAccountInfoMapped(user: UserDocument): MeViewModel {
    return {
      email: user.email,
      login: user.login,
      userId: user._id.toString(),
    };
  }

  async findUserByUserId(userId: string): Promise<MeViewModel | null> {
    const user: UserDocument | null = await this.userModel.findOne({
      _id: new ObjectId(userId),
    });

    if (!user) {
      return null;
    } else {
      return this.getMyAccountInfoMapped(user);
    }
  }
}
