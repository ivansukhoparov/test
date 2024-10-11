import { Injectable } from '@nestjs/common';
import { User, UserDocument, UserModelType } from '../domain/user.entity';
import { InjectModel } from '@nestjs/mongoose';
import { ObjectId } from 'mongodb';
import {
  UserEmailConfirmation,
  UserEmailConfirmationDocument,
  UserEmailConfirmationModelType,
} from '../domain/user-email-confirmation.entity';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectModel(User.name) private userModel: UserModelType,
    @InjectModel(UserEmailConfirmation.name)
    private userEmailConfirmationModel: UserEmailConfirmationModelType,
  ) {}

  //WE USE THIS TO ELIMINATE IF/ELSE IN SERVICE WHILE FINDING ENTITY BY ID WHEN WE NEED TO DELETE/UPDATE THE ENTITY:
  //async findEntityByIdOrNotFoundError(id: string) {
  // const result = await this.findById(id);
  // if (!result) {
  // throw new NotFoundException('Entity was not found')
  // }
  // return result;
  // }

  async createUser(newUserDTO: User): Promise<string | null> {
    const savedUser = new this.userModel(newUserDTO);
    const result: UserDocument = await savedUser.save();
    if (result) {
      return result._id.toString();
    } else {
      console.log('could not create user, repo');
      return null;
    }
  }

  async createUserEmailConfirmationInfo(
    dto: UserEmailConfirmation,
  ): Promise<string | null> {
    const saved = new this.userEmailConfirmationModel(dto);
    const result = await saved.save();
    if (result) {
      return result.confirmationCode;
    } else return null;
  }

  async deleteUser(id: string): Promise<boolean> {
    const deletingResult = await this.userModel.deleteOne({
      _id: new ObjectId(id),
    });

    return deletingResult.deletedCount === 1;
  }

  async findById(id: string): Promise<UserDocument | null> {
    const user: UserDocument | null = await this.userModel.findOne({
      _id: new ObjectId(id),
    });

    if (user) {
      return user;
    } else {
      return null;
    }
  }

  async findUserByEmail(email: string): Promise<UserDocument | null> {
    const user: UserDocument | null = await this.userModel.findOne({
      email: email,
    });

    if (user) {
      return user;
    } else {
      return null;
    }
  }

  async findUserByLogin(login: string): Promise<UserDocument | null> {
    const user: UserDocument | null = await this.userModel.findOne({
      login: login,
    });

    if (user) {
      return user;
    } else {
      return null;
    }
  }

  async findByLoginOrEmail(loginOrEmail: string): Promise<UserDocument | null> {
    const user: UserDocument | null = await this.userModel.findOne({
      $or: [{ login: loginOrEmail }, { email: loginOrEmail }],
    });

    if (user) {
      return user;
    } else {
      return null;
    }
  }

  async findUserByConfirmationCode(
    code: string,
  ): Promise<UserEmailConfirmationDocument | null> {
    const userEmailConfirmationInfo =
      await this.userEmailConfirmationModel.findOne({ confirmationCode: code });

    if (userEmailConfirmationInfo) {
      return userEmailConfirmationInfo;
    } else return null;
  }

  async confirmUser(userId: string): Promise<boolean> {
    const result = await this.userModel.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { isConfirmed: true } },
    );

    return result.modifiedCount === 1;
  }

  async updateConfirmationCode(userId: string, code: string, expDate: string) {
    const result = await this.userEmailConfirmationModel.updateOne(
      { userId: userId },
      { $set: { confirmationCode: code, expirationDate: expDate } },
    );

    return result.modifiedCount === 1;
  }

  async updatePassword(userId: string, passwordHash: string) {
    const result = await this.userModel.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { passwordHash: passwordHash } },
    );

    return result.modifiedCount === 1;
  }
}
